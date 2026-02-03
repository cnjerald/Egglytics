import { initializeViewer, setupCanvas, setupCanvasResize, setupMouseTracker, getMouseImagePosition } from './image_editor/viewer.js';
import { PointAnnotationManager } from './image_editor/pointAnnotations.js';
import { RectAnnotationManager } from './image_editor/rectAnnotations.js';
import { GridManager } from './image_editor/grid.js';
import { UIManager } from './image_editor/ui.js';
import { addPointToServer, removePointFromServer, addRectToServer, removeRectFromServer } from './image_editor/api.js';
import { PolygonManager } from './image_editor/polygonManager.js';

$(document).ready(function () {
    // Configuration
    const ADD_ANNOTATION_KEY = "e";
    const DELETE_ANNOTATION_KEY = "r";
    const GRID_TOGGLE_KEY = "";
    const FILL_CELL_KEY = "w";

    // State
    let isPointAnnotate = true;
    let isRectAnnotate = false;
    let isRecalibrate = false;
    let viewerReady = false;
    let lastMousePos = null;
    let totalEggs = window.total_egg_count;

    // Get elements
    const annotationListEl = document.getElementById("annotation-list");
    const modeEl = document.getElementById("current-mode");
    const eggCountEl = document.getElementById("egg_count");
    const imageUrl = document.getElementById("viewer").dataset.imageUrl;
    const imageId = window.image_id;
    console.log(imageId);

    // Initialize managers
    const viewer = initializeViewer(imageUrl);
    const canvas = setupCanvas(viewer);
    const pointManager = new PointAnnotationManager(viewer, canvas);
    const rectManager = new RectAnnotationManager(viewer);
    const polygonManager = new PolygonManager(viewer, canvas);
    const gridManager = new GridManager(viewer, 512);
    const uiManager = new UIManager(annotationListEl, modeEl, eggCountEl);

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

        uiManager.renderPointsList(viewer, pointManager, true);
        uiManager.setupScrollPagination(pointManager);
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
        if (e.key.toLowerCase() !== ADD_ANNOTATION_KEY) return;

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
            uiManager.renderPointsList(viewer, pointManager, true);

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
                uiManager.renderRectList(viewer, rectManager);
            }
        } else if (isRecalibrate) {
            // Joaquin CLEAN THESE UP TY - JERALD [1]
            // Try to close polygon first
            const closed = polygonManager.tryClosePolygon(pos.x, pos.y);

            if (closed) {
                console.log("Polygon closed");

                // Last polygon added
                const polygons = polygonManager.getPolygons();
                uiManager.renderAnnotationUI(viewer,polygonManager);
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

        // ESC → Cancel current polygon
        if (e.key === "Escape") {
            polygonManager.cancelCurrentPolygon();
            console.log("Polygon drawing cancelled");
        }

        // Backspace → Undo last vertex
        if (e.key === "Backspace") {
            e.preventDefault(); // prevent browser back
            polygonManager.removeLastPoint();
            console.log("Last vertex removed");
        }

        // Delete → Remove last completed polygon
        if (e.key === "b") {
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
        if (e.key.toLowerCase() !== DELETE_ANNOTATION_KEY) return;

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
                uiManager.renderPointsList(viewer, pointManager, true);
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
        if (e.key.toLowerCase() !== FILL_CELL_KEY) return;

        if(gridManager.isVisible()){
            const pos = getMouseImagePosition(viewer, lastMousePos);
            if (!pos) return;
            gridManager.toggleCell(pos.x, pos.y);
        }


    });


    // Joaquin CLEAN THESE UP TY - JERALD [3] uhh too meany repetitions here...
    // Mode buttons
    $("#point-btn").on("click", function () {
        isPointAnnotate = true;
        isRectAnnotate = false;
        isRecalibrate = false;
        document.getElementById("annotation-msg").textContent = "Annotations";
        document.getElementById("recalibrate-btn").hidden = false;
        document.getElementById("submit-recalibration").hidden = true;

        totalEggs = pointManager.getPoints().length;
        uiManager.setEggCount(totalEggs)

        uiManager.setMode("Point");
        uiManager.clearList();
        
        pointManager.setVisible(true);
        uiManager.renderPointsList(viewer, pointManager, true);
        rectManager.hideAll();
    });

    $("#rect-btn").on("click", function () {
        isPointAnnotate = false;
        isRectAnnotate = true;
        isRecalibrate = false;
        document.getElementById("annotation-msg").textContent = "Annotations";
        document.getElementById("recalibrate-btn").hidden = false;
        document.getElementById("submit-recalibration").hidden = true;

        totalEggs = rectManager.getRects().length
        uiManager.setEggCount(totalEggs)

        uiManager.setMode("Rectangle");
        uiManager.clearList();
        
        uiManager.renderRectList(viewer, rectManager);
        rectManager.restoreAll();
        pointManager.setVisible(false);
    });

    $("#recalibrate-yes").on("click", function () {
        $("#recalibrate-modal").addClass("hidden");
        
        // Activate recalibration mode
        isRecalibrate = true;
        isPointAnnotate = false;
        isRectAnnotate = false;

        uiManager.setEggCount(0)

        document.getElementById("annotation-msg").textContent = 
        "Please create at least 3 polygons to recalibrate, you may still cancel recalibration by selecting any annotation tools. This process is usually done only ONCE";

        document.getElementById("recalibrate-btn").hidden = true;
        document.getElementById("submit-recalibration").hidden = false;


        uiManager.setMode("Recalibrate")
        uiManager.clearList();
        rectManager.hideAll();

    });

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