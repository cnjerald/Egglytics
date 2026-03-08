import { initializeViewer, setupCanvas, setupCanvasResize, setupMouseTracker, getMouseImagePosition } from './image_editor/viewer.js';
import { PointAnnotationManager } from './image_editor/pointAnnotations.js';
import { RectAnnotationManager } from './image_editor/rectAnnotations.js';
import { GridManager } from './image_editor/grid.js';
import { UIManager } from './image_editor/ui.js';
import { addPointToServer, removePointFromServer, addRectToServer, removeRectFromServer } from './image_editor/api.js';
import { PolygonManager } from './image_editor/polygonManager.js';
import { KEYBINDS } from './other/keybinds.js';

$(document).ready(function () {
    // State
    let isPointAnnotate = true;
    let isRectAnnotate = false;
    let isRecalibrate = false;
    let viewerReady = false;
    let lastMousePos = null;
    let totalEggs = window.total_egg_count;

    // Get elements
    const messageEl = document.getElementById("messages");
    const modeEl = document.getElementById("current-mode");
    const eggCountEl = document.getElementById("egg_count");
    const imageUrl = document.getElementById("viewer").dataset.imageUrl;
    const imageId = window.image_id;
    const savedGrids = window.grids

    // Initialize managers
    const viewer = initializeViewer(imageUrl);
    const canvas = setupCanvas(viewer);
    const pointManager = new PointAnnotationManager(viewer, canvas);
    const rectManager = new RectAnnotationManager(viewer);
    const polygonManager = new PolygonManager(viewer, canvas);
    const gridManager = new GridManager(viewer, 512, imageId);
    const uiManager = new UIManager(messageEl, modeEl, eggCountEl);

    // Set initial egg count
    uiManager.setEggCount(totalEggs);
    // This sets on what is displayed on the screen..
    function redrawAll() {
        rectManager.hideAll();
        if(isPointAnnotate){
            pointManager.redraw();    // draw points on top
        } else if (isRecalibrate){
            polygonManager.redraw();  // draw polygons + preview
        } else if (isRectAnnotate){
            rectManager.restoreAll();
        }
    }
        
    // Setup canvas resize and redraw
    setupCanvasResize(viewer, canvas, () => redrawAll());


    // Setup mouse tracker
    setupMouseTracker(viewer, function (event) {
        lastMousePos = event.position;

        if (!isRectAnnotate || rectManager.getEdges().length !== 1) return;

        const pos = getMouseImagePosition(viewer, event.position);
        const edges = rectManager.getEdges();
        rectManager.updatePreview(edges[0][0], edges[0][1], pos.x, pos.y);
    });

    // Viewer open handler
    viewer.addHandler("open", function () {
        console.log("Viewer opened and ready!");
        viewerReady = true;

        if (Array.isArray(window.points)) {
            pointManager.loadPoints(window.points);
        }
        if (Array.isArray(window.rects)) {
            rectManager.loadRects(window.rects);
        }

        console.log("Image size:", viewer.world.getItemAt(0).getContentSize());
        console.log("Sample point:", pointManager.getPoints()[0]);

        gridManager.loadGrid(savedGrids);
    });

    // Canvas click handler
    viewer.addHandler('canvas-click', function(event) {
        pointManager.setSelectedPoint(null);
        pointManager.redraw();
    });

    document.addEventListener("mousemove", () => {
        if (!isRecalibrate) return;

        const pos = getMouseImagePosition(viewer, lastMousePos);
        if (!pos) return;

        polygonManager.updatePreview(pos.x, pos.y);
    });




    // Add annotation (E key)
    document.addEventListener("keydown", async (e) => {
        if (e.key.toLowerCase() !== KEYBINDS.ADD_ANNOTATION) return;

        const pos = getMouseImagePosition(viewer, lastMousePos);
        if (!pos) return;

        if (isPointAnnotate) {
            pointManager.addPoint(pos.x, pos.y);
            const success = await addPointToServer(imageId, pos.x, pos.y);
            
            if (success) {
                totalEggs++;
                uiManager.setEggCount(totalEggs);
            }

            pointManager.redraw();

        } else if (isRectAnnotate) {
            const edgeCount = rectManager.addEdge(pos.x, pos.y);

            if (edgeCount === 1) {
                console.log("First corner placed");
            } else if (edgeCount === 2) {
                const edges = rectManager.getEdges();
                rectManager.hidePreview();
                rectManager.addRect(edges[0][0], edges[0][1], edges[1][0], edges[1][1]);

                const success = await addRectToServer(
                    imageId,
                    edges[0][0],
                    edges[0][1],
                    edges[1][0],
                    edges[1][1]
                );

                if (success) {
                    totalEggs++;
                    uiManager.setEggCount(totalEggs);
                }

                rectManager.clearEdges();
            }
        } else if (isRecalibrate) {
            // Try to close polygon first
            const closed = polygonManager.tryClosePolygon(pos.x, pos.y);

            if (closed) {
                console.log("Polygon closed");

                // Last polygon added
                const polygons = polygonManager.getPolygons();

                // You might need this so i left it here 
                let averagePixels = polygonManager.getAverageAreaOfPolygons()

                if(polygons.length == 3){
                    document.getElementById("submit-recalibration").disabled = false;
                    //recalibrateImage(imageId,averagePixels);
                }
                
                return;
            }

            // Otherwise add new vertex
            polygonManager.addPoint(pos.x, pos.y);
            polygonManager.redraw();
            

            console.log("Polygon edge added");
        }
    });
    // Joaquin CLEAN THESE UP TY - JERALD [2]
    document.addEventListener("keydown", (e) => {
        // THIS IS FOR RECALIB ONLY!
        if (!isRecalibrate) return;

        if (e.key === KEYBINDS.RECALIBRATE_CANCEL) {
            polygonManager.cancelCurrentPolygon();
            console.log("Polygon drawing cancelled");
        }

        if (e.key === KEYBINDS.RECALIBRATE_UNDO_VERTEX) {
            e.preventDefault(); // prevent browser back
            polygonManager.removeLastPoint();
            console.log("Last vertex removed");
        }

        if (e.key === KEYBINDS.RECALIBRATE_REMOVE_POLYGON) {
            polygonManager.removeLastPolygon();
            console.log("Last polygon erased");
        }
    });


    // This is the event listener for the submit button
    $("#submit-recalibration").on("click", function () {
        const averagePixels = polygonManager.getAverageAreaOfPolygons()
        recalibrateImage(imageId,averagePixels);
    });

    // This sends the request to the server to recalibrate.
    function recalibrateImage(imageId, averagePixels){
        $.ajax({
            url: "/recalibrate/",
            type: "POST",
            data: JSON.stringify({
                imageId: imageId,
                averagePixels: averagePixels,
                mode : "macro"
            }),
            contentType: "application/json",
            headers: {
                "X-CSRFToken": getCSRFToken(),
            },
            success: function (response) {
                console.log("Received image! Redirecting..:", response);
                window.location.href = "/view/";  
            },
            error: function (xhr) {
                console.error("Failed:", xhr.responseText);
            }
        });
    }


    // Delete annotation (R key)
    document.addEventListener("keydown", async (e) => {
        if (e.key.toLowerCase() !== KEYBINDS.DELETE_ANNOTATION) return;

        const pos = getMouseImagePosition(viewer, lastMousePos);
        if (!pos) return;

        if (isPointAnnotate) {
            const removed = pointManager.removePointAt(pos.x, pos.y, 10);
            if (removed) {
                const success = await removePointFromServer(imageId, removed.x, removed.y);
                
                if (success) {
                    totalEggs--;
                    uiManager.setEggCount(totalEggs);
                }

                pointManager.redraw();
            }

        } else if (isRectAnnotate) {
            const rect = rectManager.findRectAtPoint(pos.x, pos.y);
            if (rect) {
                const success = await removeRectFromServer(
                    imageId,
                    rect.x,
                    rect.y,
                    rect.x + rect.width,
                    rect.y + rect.height
                );

                if (success) {
                    totalEggs--;
                    uiManager.setEggCount(totalEggs);
                }

                rectManager.removeRect(rect);
                console.log("Rectangle deleted");
            }
        } 

    });

    // Fill grid cell (F key)
    window.addEventListener("keydown", (e) => {
        if (e.key.toLowerCase() !== KEYBINDS.FILL_CELL) return;

        if(gridManager.isVisible()){
            const pos = getMouseImagePosition(viewer, lastMousePos);
            if (!pos) return;
            gridManager.toggleCell(pos.x, pos.y);
        }


    });

    // Central function to set annotation mode
    function setAnnotationMode({ point = false, rect = false, modeName = "Point" }) {
        // Update mode flags
        isPointAnnotate = point;
        isRectAnnotate = rect;
        isRecalibrate = modeName === "Recalibrate";

        // Update UI elements
        const annotationMsg = document.getElementById("annotation-msg");
        const recalibrateBtn = document.getElementById("recalibrate-btn");
        const cancelBtn = document.getElementById("cancel-recalibration");
        const submitBtn = document.getElementById("submit-recalibration");

        annotationMsg.textContent = modeName === "Recalibrate"
            ? "Please create at least 3 polygons to recalibrate, you may still cancel recalibration by selecting any annotation tools. This process is usually done only ONCE"
            : "Grid Tools";

        recalibrateBtn.hidden = modeName === "Recalibrate";
        cancelBtn.hidden = modeName !== "Recalibrate";
        submitBtn.hidden = modeName !== "Recalibrate";

        // Count eggs/rects if not recalibration
        const total = point ? pointManager.getPoints().length
                    : rect ? rectManager.getRects().length
                    : 0;
        uiManager.setEggCount(total);

        // Set mode and clear annotation list
        uiManager.setMode(modeName);
        uiManager.clearList();

        // Show/hide annotation objects
        pointManager.setVisible(point);
        rect ? rectManager.restoreAll() : rectManager.hideAll();

        // Optionally hide tools in recalibration mode
        if (modeName === "Recalibrate"){
            hideTools();
        } else{
            showTools();
        }
    }

    // ------------------- Bind annotation buttons -------------------
    $("#point-btn").on("click", () => setAnnotationMode({ point: true, modeName: "Point" }));
    $("#rect-btn").on("click", () => setAnnotationMode({ rect: true, modeName: "Rectangle" }));

    // ------------------- Recalibration -------------------
    $("#recalibrate-yes").on("click", () => {
        // Check if user has chosen to not show the guide again
        const dontShowGuide = localStorage.getItem('hideRecalibrateGuide') === 'true';
        
        if (!dontShowGuide) {
            // Show the guide modal
            $("#recalibrate-guide-modal").addClass("is-visible");
        } else {
            // Directly enter recalibration mode
            setAnnotationMode({ modeName: "Recalibrate" });
        }
    });

    // Handle "Got it!" button in guide modal
    $("#recalibrate-guide-ok").on("click", function () {
        // Check if "don't show again" is checked
        const dontShowAgain = $("#dont-show-recalibrate-guide").is(":checked");
        
        if (dontShowAgain) {
            localStorage.setItem('hideRecalibrateGuide', 'true');
        }
        
        // Hide the guide modal
        $("#recalibrate-guide-modal").removeClass("is-visible");
        
        // Enter recalibration mode
        setAnnotationMode({ modeName: "Recalibrate" });
    });

    // Handle close button on guide modal
    $("#recalibrate-guide-modal .close-button").on("click", function () {
        $("#recalibrate-guide-modal").removeClass("is-visible");
    });

    // Cancel recalibration
    $("#cancel-recalibration").on("click", () => setAnnotationMode({ point: true, modeName: "Point" }));


    function hideTools(){
        document.getElementById("toolsText").hidden = true;
        document.getElementById("point-btn").style.display = "none";
        document.getElementById("rect-btn").style.display = "none";
        document.getElementById("grid-btn").style.display = "none";
    }

    function showTools(){
        document.getElementById("toolsText").hidden = false;
        document.getElementById("point-btn").style.display = "inline-block";
        document.getElementById("rect-btn").style.display = "inline-block";
        document.getElementById("grid-btn").style.display = "inline-block";
    }

    // CLEAN END


    $("#grid-btn").on("click", function () {
        const isVisible = gridManager.isVisible();
        gridManager.setVisible(!isVisible);
    });

    $("#recalibrate-btn").on("click", function () {
        $("#recalibrate-modal").addClass("is-visible");
    });

    $("#recalibrate-no, #recalibrate-yes").on("click", function () {
        $("#recalibrate-modal").removeClass("is-visible");
    });


    // Close modal if clicking outside content
    $("#recalibrate-modal").on("click", function (e) {
        // Only close if clicked on the backdrop, not the content
        if (e.target === this) {
            $(this).removeClass("is-visible");
        }
    });

    $("#open-instructions").on("click", function () {
        $("#instructions-modal").addClass("is-visible");
    });

    $("#instructions-modal .close-button").on("click", function () {
        $("#instructions-modal").removeClass("is-visible");
    });

    // Click outside to close
    $(window).on("click", function (e) {
        if (e.target.id === "instructions-modal") {
            $("#instructions-modal").removeClass("is-visible");
        }
    });


    function getCSRFToken() {
        const name = 'csrftoken';
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = $.trim(cookies[i]);
            if (cookie.startsWith(name + '=')) {
                return decodeURIComponent(cookie.substring(name.length + 1));
            }
        }
        return '';
    }




});