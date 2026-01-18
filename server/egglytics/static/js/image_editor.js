$(document).ready(function () {

    
    let ADD_ANNOTATION_KEY = "e"
    let DELETE_ANNOTATION_KEY = "r"
    let GRID_KEY = ""

    // By default user is on point annotate.
    let isPointAnnotate = true;
    let isRectAnnotate = false;
    let isGridVisible = false;
    let pointsVisible = true;
  
    let points = [];
    let selectedPoint = null; // currently selected point


    let lastMousePos = null;
    let viewerReady = false;

    let edges = [];            // [[x1,y1], [x2,y2]]
    let previewRect = null;    // overlay element
    const rects = []; // store all rectangles

    let gridOverlays = [];
    let gridSize = 512; // image pixels per cell
    let filledCells = new Map(); // key -> overlay element

    const PAGE_SIZE = 50;
    let renderedCount = 0;

    let totalEggs = window.total_egg_count
    console.log(totalEggs);


    const AnnotationListEl = document.getElementById("annotation-list");
    const modeEl = document.getElementById("current-mode");
    const eggCountEl = document.getElementById("egg_count");


    setTotalEggCount();

    const imageUrl = document
        .getElementById("viewer")
        .dataset.imageUrl;

    const viewer = OpenSeadragon({
        id: "viewer",
        prefixUrl: "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/",
        tileSources: {
            type: "image",
            url: imageUrl
        },
        backgroundColor: "black",
        gestureSettingsMouse: {
            clickToZoom: false,
        },
        keyboardEnabled: false,

        // MINIMAP stuff
        showNavigator: true,
        navigatorPosition: "BOTTOM_RIGHT",
        navigatorSizeRatio: 0.2,
        navigatorMaintainSizeRatio: true,
        navigatorBackground: "#000",
        navigatorBorderColor: "#1480ecff",
        navigatorOpacity: 1
    });

    // Open the viewer (Load image)
    viewer.addHandler("open", function () {
        console.log(" Viewer opened and ready!");
        viewerReady = true;
    });

    // This disables default keys of openseadragon.
    viewer.addHandler('canvas-key',event=>{
        if(['q', 'w', 'e', 'r', 'a', 's', 'd', 'f','R'].includes(event.originalEvent.key)){
            event.preventDefaultAction = true;
        }
    });

    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = 0;
    canvas.style.left = 0;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";

    viewer.canvas.appendChild(canvas);

    function resizeCanvas() {
        const container = viewer.container;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;

        // redraw points after resizing
        redrawPoints();
    }

    viewer.addHandler("open", resizeCanvas);
    viewer.addHandler("resize", resizeCanvas);
    viewer.addHandler("viewport-change", redrawPoints);

    function redrawPoints() {
        if (!pointsVisible) return;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const tiledImage = viewer.world.getItemAt(0);

        for (const p of points) {
            const vp = tiledImage.imageToViewportCoordinates(p.x, p.y);
            const pixel = viewer.viewport.pixelFromPoint(vp, true);

            const size = 10;
            const halfSize = size / 2;

            // determine color
            let color = "lime";           // default
            if (p === selectedPoint) color = "red";  // clicked/selected
            else if (p.hover) color = "yellow";      // hover

            // draw circle with border like your div overlay design
            ctx.fillStyle = color;
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.arc(pixel.x, pixel.y, halfSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }


    function loadPoints(loadedPoints) {
        // loadedPoints = [{x:..., y:...}, ...]

        points.length = 0;               // clear existing
        loadedPoints.forEach(p => {
            points.push({
                x: Number(p.x),
                y: Number(p.y)
            });
        });

        redrawPoints();                  // ONE draw
        renderPointsList(true);              // ONE list render
    }

    viewer.addHandler("open", function () {
        console.log("Viewer opened and ready!");
        viewerReady = true;

        if (Array.isArray(window.points)) {
            loadPoints(window.points);
        }
        console.log(
            "Image size:",
            viewer.world.getItemAt(0).getContentSize()
        );
        console.log("Sample point:", points[0]);
    });

    // Track mouse movement on canvas
    new OpenSeadragon.MouseTracker({
        element: viewer.canvas,
        moveHandler: function (event) {
            lastMousePos = event.position;

            if (!isRectAnnotate || edges.length !== 1) return;

            const pos = getMouseImagePosition(event);
            updatePreviewRect(edges[0][0], edges[0][1], pos.x, pos.y);
        }
    });

    viewer.addHandler('canvas-click', function(event) {
        selectedPoint = null;
        redrawPoints();
    });


    // Convert to image coordinates
    function getMousePosition() {
        if (!lastMousePos) {
            console.log(" No mouse position tracked yet");
            return null;
        }

        const viewportPoint = viewer.viewport.pointFromPixel(lastMousePos);
        const imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);

        return {
            x: Math.round(imagePoint.x),
            y: Math.round(imagePoint.y)
        };
    }

    function setTotalEggCount(){
        eggCountEl.innerHTML = "Egg Count: " + totalEggs;

    }

    // Pressing E draws a point at last mouse position
    document.addEventListener("keydown", (e) => {
        if (e.key.toLowerCase() === ADD_ANNOTATION_KEY) {
            if(isPointAnnotate){
                const pos = getMousePosition();
                if (!pos) return;

                points.push(pos);
                sendPoint(image_id,pos.x,pos.y)
                redrawPoints();
                renderPointsList(true);
            } else if (isRectAnnotate){

                const pos = getMousePosition();
                if (!pos) return;

                edges.push([pos.x, pos.y]);

                if (edges.length === 1) {
                    console.log("First corner placed");
                } else if (edges.length === 2) {
                    hidePreviewRect();
                    drawRectOSD(edges);
                        sendRect(
                            image_id,
                            edges[0][0], // x1
                            edges[0][1], // y1
                            edges[1][0], // x2
                            edges[1][1]  // y2
                        );
                    edges = [];
                    renderRectList(); 
                }
            }

        }
    });

    // Listen for 'R' key
    document.addEventListener("keydown", (e) => {
        if (e.key.toLowerCase() === DELETE_ANNOTATION_KEY) {
            if(isPointAnnotate){
                removePointAtCursor();
                setTotalEggCount();
            } else if (isRectAnnotate){
                const pos = getMousePosition(); // image coordinates
                if (!pos) return;

                for (let i = rects.length - 1; i >= 0; i--) {
                    const r = rects[i];

                    if (isPointInsideRect(pos.x, pos.y, r)) {
                        viewer.removeOverlay(r.element);
                        remove_rect(
                            image_id,
                            r.x,
                            r.y,
                            r.x + r.width,
                            r.y + r.height
                        );
                        rects.splice(i, 1);
                        console.log(" Rectangle deleted");
                        break; // remove only one
                    }
                }
            }
        }
    });

    // Remove point under cursor
    function removePointAtCursor() {
        const pos = getMousePosition();
        if (!pos) return;

        const tolerance = 10;

        for (let i = points.length - 1; i >= 0; i--) {
            const p = points[i]; //  get the point object

            const dx = p.x - pos.x;
            const dy = p.y - pos.y;

            if (Math.hypot(dx, dy) <= tolerance) {

                // send correct coordinates
                remove_point(image_id, p.x, p.y);
                // remove from memory
                points.splice(i, 1);

                redrawPoints();
                renderPointsList(true);
                break;
            }
        }
    }


    // Remove points at VIEW (Does not remove it from memory, but removes it from the view)
    function removeViewPoints() {
        // Clear the canvas completely
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Remove overlay elements if you are using any per-point divs
        points.forEach(pt => {
            if (pt.element) {
                viewer.removeOverlay(pt.element);
                pt.element = null; // mark as removed from view
            }
        });

        // Optional: reset any selection
        points.forEach(pt => pt.selected = false);
        selectedPoint = null;
    }

    
    function updatePreviewRect(x1, y1, x2, y2) {
        const tiledImage = viewer.world.getItemAt(0);

        const minX = Math.min(x1, x2);
        const minY = Math.min(y1, y2);
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);

        const vpTopLeft = tiledImage.imageToViewportCoordinates(minX, minY);
        const vpBottomRight = tiledImage.imageToViewportCoordinates(minX + width, minY + height);

        const vpWidth = vpBottomRight.x - vpTopLeft.x;
        const vpHeight = vpBottomRight.y - vpTopLeft.y;

        if (!previewRect) {
            previewRect = document.createElement("div");
            previewRect.style.border = "2px dashed #ff6b6b";
            previewRect.style.background = "rgba(255,107,107,0.15)";
            previewRect.style.pointerEvents = "none";
            previewRect.style.boxSizing = "border-box";

            viewer.addOverlay({
                element: previewRect,
                location: new OpenSeadragon.Rect(
                    vpTopLeft.x,
                    vpTopLeft.y,
                    vpWidth,
                    vpHeight
                )
            });
        } else {
            viewer.updateOverlay(
                previewRect,
                new OpenSeadragon.Rect(
                    vpTopLeft.x,
                    vpTopLeft.y,
                    vpWidth,
                    vpHeight
                )
            );
        }
    }

    function hidePreviewRect() {
        if (previewRect) {
            viewer.removeOverlay(previewRect);
            previewRect = null;
        }
    }

    function drawRectOSD(edges, color = "red", lineWidth = 2) {
        if (edges.length !== 2) return;

        const [x1, y1] = edges[0];
        const [x2, y2] = edges[1];

        const minX = Math.min(x1, x2);
        const minY = Math.min(y1, y2);
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);

        const tiledImage = viewer.world.getItemAt(0);
        const vpTL = tiledImage.imageToViewportCoordinates(minX, minY);
        const vpBR = tiledImage.imageToViewportCoordinates(minX + width, minY + height);

        const rectEl = document.createElement("div");
        rectEl.style.border = `${lineWidth}px solid ${color}`;
        rectEl.style.pointerEvents = "none";
        rectEl.style.boxSizing = "border-box";

        // generate a stable overlay ID
        const overlayId = `rect-${rects.length}-${Date.now()}`;

        viewer.addOverlay({
            id: overlayId,
            element: rectEl,
            location: new OpenSeadragon.Rect(
                vpTL.x,
                vpTL.y,
                vpBR.x - vpTL.x,
                vpBR.y - vpTL.y
            )
        });

        // store rectangle in IMAGE coordinates + overlay tracking
        rects.push({
            x: minX,
            y: minY,
            width,
            height,
            element: rectEl,
            overlayId
        });
    }

    function removeViewRectangles() {
        for (let i = 0; i < rects.length; i++) {
            const r = rects[i];
            if (r.element) {
                viewer.removeOverlay(r.element);
                r.element = null; 
            }
        }
    }


    function restoreViewRectangles(color = "red", lineWidth = 2) {
        if (!viewerReady || !viewer) return;

        const tiledImage = viewer.world.getItemAt(0);

        for (let i = 0; i < rects.length; i++) {
            const r = rects[i];

            // Prevent duplicate redraw
            if (r.element) continue;

            const vpTL = tiledImage.imageToViewportCoordinates(r.x, r.y);
            const vpBR = tiledImage.imageToViewportCoordinates(
                r.x + r.width,
                r.y + r.height
            );

            const rectEl = document.createElement("div");
            rectEl.style.border = `${lineWidth}px solid ${color}`;
            rectEl.style.pointerEvents = "none";
            rectEl.style.boxSizing = "border-box";

            viewer.addOverlay({
                element: rectEl,
                location: new OpenSeadragon.Rect(
                    vpTL.x,
                    vpTL.y,
                    vpBR.x - vpTL.x,
                    vpBR.y - vpTL.y
                )
            });

            // critical: restore element reference
            r.element = rectEl;
        }
    }
    
    function isPointInsideRect(px, py, rect) {
        return (
            px >= rect.x &&
            px <= rect.x + rect.width &&
            py >= rect.y &&
            py <= rect.y + rect.height
        );
    }

    function getMouseImagePosition(event) {
        const viewportPoint = viewer.viewport.pointFromPixel(event.position);
        const imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);

        return {
            x: Math.round(imagePoint.x),
            y: Math.round(imagePoint.y)
        };
    }



    function drawGrid() {
        if (!viewerReady) return;

        clearGrid(); // remove any old grid lines + green boxes

        const tiledImage = viewer.world.getItemAt(0);
        const imageSize = tiledImage.getContentSize();

        const cols = Math.floor(imageSize.x / gridSize);
        const rows = Math.floor(imageSize.y / gridSize);

        // Vertical grid lines
        for (let c = 1; c <= cols; c++) {
            const x = c * gridSize;

            const vpTop = tiledImage.imageToViewportCoordinates(x, 0);
            const vpBottom = tiledImage.imageToViewportCoordinates(x, imageSize.y);

            const line = document.createElement("div");
            line.style.background = "rgba(0,0,0,0.3)";
            line.style.pointerEvents = "none";

            viewer.addOverlay({
                element: line,
                location: new OpenSeadragon.Rect(
                    vpTop.x,
                    vpTop.y,
                    0.0005,
                    vpBottom.y - vpTop.y
                )
            });

            gridOverlays.push(line);
        }

        // Horizontal grid lines
        for (let r = 1; r <= rows; r++) {
            const y = r * gridSize;

            const vpLeft = tiledImage.imageToViewportCoordinates(0, y);
            const vpRight = tiledImage.imageToViewportCoordinates(imageSize.x, y);

            const line = document.createElement("div");
            line.style.background = "rgba(0,0,0,0.3)";
            line.style.pointerEvents = "none";

            viewer.addOverlay({
                element: line,
                location: new OpenSeadragon.Rect(
                    vpLeft.x,
                    vpLeft.y,
                    vpRight.x - vpLeft.x,
                    0.0005
                )
            });

            gridOverlays.push(line);
        }

        console.log("Grid drawn");
    }


    function clearGrid() {
        // Remove grid lines
        gridOverlays.forEach(el => viewer.removeOverlay(el));
        gridOverlays = [];

        // Remove green boxes from VIEW only
        filledCells.forEach(el => viewer.removeOverlay(el));
    }


    function fillGridCell(x, y) {
        if (!viewerReady) return;

        const tiledImage = viewer.world.getItemAt(0);

        const col = Math.floor(x / gridSize);
        const row = Math.floor(y / gridSize);
        const key = `${col},${row}`;

        const cellX = col * gridSize;
        const cellY = row * gridSize;

        // Padding
        const pad = 7;
        const cellWidth = gridSize - pad;
        const cellHeight = gridSize - pad;

        // Convert image → viewport coordinates
        const vpTL = tiledImage.imageToViewportCoordinates(
            cellX + pad,
            cellY + pad
        );
        const vpBR = tiledImage.imageToViewportCoordinates(
            cellX + pad + cellWidth,
            cellY + pad + cellHeight
        );

        const vpWidth = vpBR.x - vpTL.x;
        const vpHeight = vpBR.y - vpTL.y;

        //  TOGGLE
        if (filledCells.has(key)) {
            viewer.removeOverlay(filledCells.get(key));
            filledCells.delete(key);
            return;
        }

        // Create filled cell overlay
        const cellEl = document.createElement("div");
        cellEl.style.background = "rgba(0, 255, 0, 0.4)"; // greenish
        cellEl.style.pointerEvents = "none";
        cellEl.style.boxSizing = "border-box";

        viewer.addOverlay({
            element: cellEl,
            location: new OpenSeadragon.Rect(
                vpTL.x,
                vpTL.y,
                vpWidth,
                vpHeight
            )
        });

        filledCells.set(key, cellEl);
    }

    function clearAllCells() {
        // Remove all filled cell overlays from view
        filledCells.forEach(el => viewer.removeOverlay(el));
    }

    function restoreAllCells() {
        if (!viewerReady) return;

        const tiledImage = viewer.world.getItemAt(0);

        filledCells.forEach((el, key) => {
            // Only restore if the overlay is currently removed
            // We check if the element is in the DOM; if not, re-add it
            if (!el.isConnected) {
                const [col, row] = key.split(",").map(Number);

                const cellX = col * gridSize;
                const cellY = row * gridSize;
                const pad = 7;
                const cellWidth = gridSize - pad;
                const cellHeight = gridSize - pad;

                const vpTL = tiledImage.imageToViewportCoordinates(
                    cellX + pad,
                    cellY + pad
                );
                const vpBR = tiledImage.imageToViewportCoordinates(
                    cellX + pad + cellWidth,
                    cellY + pad + cellHeight
                );

                viewer.addOverlay({
                    element: el,
                    location: new OpenSeadragon.Rect(
                        vpTL.x,
                        vpTL.y,
                        vpBR.x - vpTL.x,
                        vpBR.y - vpTL.y
                    )
                });
            }
        });

        console.log("All filled cells restored");
    }

    window.addEventListener("keydown", (e) => {
        if (e.key.toLowerCase() !== "f") return;

        const pos = getMousePosition();
        if (!pos) return;


        fillGridCell(pos.x, pos.y);
    });
    function renderPointsList(reset = false) {
        if (reset) {
            AnnotationListEl.innerHTML = "";
            renderedCount = 0;
        }

        const reversed = [...points].reverse();
        const slice = reversed.slice(renderedCount, renderedCount + PAGE_SIZE);

        slice.forEach(p => {
            const li = document.createElement("li");
            li.textContent = `(X=${p.x}, Y=${p.y})`;
            li.style.cursor = "pointer";

            li.onclick = () => {
                const tiledImage = viewer.world.getItemAt(0);
                const vp = tiledImage.imageToViewportCoordinates(p.x, p.y);
                viewer.viewport.panTo(vp);

                selectedPoint = p;
                redrawPoints();
            };

            li.onmouseenter = () => {
                p.hover = true;
                redrawPoints();
            };

            li.onmouseleave = () => {
                p.hover = false;
                redrawPoints();
            };

            AnnotationListEl.appendChild(li);
        });

        renderedCount += slice.length;
    }




    function renderRectList() {
       AnnotationListEl.innerHTML = "";

        // newest first
        [...rects].reverse().forEach((r, i) => {
            const li = document.createElement("li");

            li.textContent = `Rect: X=${r.x}, Y=${r.y}, W=${r.width}, H=${r.height}`;
            li.style.cursor = "pointer";

            // Pan to rectangle center on click
            li.onclick = () => {
                const tiledImage = viewer.world.getItemAt(0);

                const cx = r.x + r.width / 2;
                const cy = r.y + r.height / 2;

                const vp = tiledImage.imageToViewportCoordinates(cx, cy);

                viewer.viewport.panTo(vp);

                // Optional: zoom in a bit
                viewer.viewport.zoomTo(
                    Math.min(
                        viewer.viewport.getMaxZoom(),
                        viewer.viewport.getZoom() * 1.3
                    )
                );
            };

            // Optional: highlight rectangle on hover
            li.onmouseenter = () => {
                if (r.element) r.element.style.borderColor = "lime";
            };
            li.onmouseleave = () => {
                if (r.element) r.element.style.borderColor = "red";
            };

            // Optional: double-click to delete rectangle
            li.ondblclick = () => {
                if (r.element) viewer.removeOverlay(r.element);
                rects.splice(rects.indexOf(r), 1);
                renderRectList();
            };

            AnnotationListEl.appendChild(li);
        });
    }

    AnnotationListEl.addEventListener("scroll", () => {
        const nearBottom =
            AnnotationListEl.scrollTop + AnnotationListEl.clientHeight >=
            AnnotationListEl.scrollHeight - 10;

        if (nearBottom && renderedCount < points.length) {
            renderPointsList(false);
        }
    });


    function clearAnnotationList() {
        AnnotationListEl.innerHTML = "";
    }

    $("#point-btn").on("click", function () {
        pointsVisible = true;
        isRectAnnotate = false;
        isPointAnnotate = true;

        setMode("Point");
        clearAnnotationList();
        redrawPoints();
        renderPointsList(true);
        removeViewRectangles();
    });

    $("#rect-btn").on("click", function () {
        isPointAnnotate = false;
        isRectAnnotate = true;
        pointsVisible = false;
        
        setMode("Rectangle");
        clearAnnotationList();
        renderRectList();
        restoreViewRectangles();
        removeViewPoints();
    });

    $("#grid-btn").on("click", function () {
        if(isGridVisible){
            isGridVisible = false;
            clearGrid();
            clearAllCells();
        } else{
            isGridVisible = true;
            drawGrid();
            restoreAllCells();
        }

    });



    function setMode(mode) {
        modeEl.textContent = mode;

        if (mode === "Point") {
            modeEl.style.color = "#6cff6c"; // green
        } else if (mode === "Rectangle") {
            modeEl.style.color = "#ff6b6b"; // red
        } else {
            modeEl.style.color = "#ccc";
        }
    }

    // --- Main sendPoint function ---
    async function sendPoint(image_id, x, y) {
        try {
            // Try to establish connection to server..
            const response = await fetch(`/add_egg_to_db_point/${image_id}/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCSRFToken("csrftoken"),
                },
                body: JSON.stringify({ x, y })
            });

            // If no connection is established
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            
            // Else if connection is established.
            const data = await response.json();
            console.log("Server says:", data.message || data.STATUS);
            totalEggs++;
            setTotalEggCount();


            return true; // Return success

        } catch (err) {
            console.error("Server offline, storing point locally:", err);

            //  Only add to unsent queue if we're NOT already retrying
            // if (!isRetryingSend) {
            //     unsentPoints.push({ image_id, x, y, radius, color });
            //     localStorage.setItem("unsentPoints", JSON.stringify(unsentPoints));
            // }
            return false; // Return failure
        }
    }

    async function remove_point(image_id, x, y) {
        // const point = { image_id, x, y, radius, color, transparency };

        try {
            const response = await fetch(`/remove_egg_from_db_point/${image_id}/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": getCSRFToken("csrftoken"),
                    },
                    body: JSON.stringify({ x, y })
                });

                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                } else{
                    totalEggs--;
                }

                const data = await response.json();
                console.log("Server says:", data.message || data.STATUS);

                // SUCCESS: Remove ghost point
                // removeGhostPoint(x, y, image_id);
                setTotalEggCount();
                return true; // Return success
        } catch (err) {
            console.warn("Deletion failed, keeping ghost point:", err);

            // // Keep ghost + add to retry queue (ONLY if not already retrying)
            // if (!isRetrying) {
            //     unsentRemovals.push(point);
            //     localStorage.setItem("unsentRemovals", JSON.stringify(unsentRemovals));
            // }
            return false; // Return failure
        }
    }

    // --- Main sendPoint function ---
    async function sendRect(image_id, x1, y1, x2, y2) {
        try {
            // Try to establish connection to server..
            const response = await fetch(`/add_egg_to_db_rect/${image_id}/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCSRFToken("csrftoken"),
                },
                body: JSON.stringify({ x1, y1, x2, y2 })
            });

            // If no connection is established
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            
            // Else if connection is established.
            const data = await response.json();
            console.log("Server says:", data.message || data.STATUS);
            totalEggs++;
            setTotalEggCount();

            return true; // Return success

        } catch (err) {
            console.error("Server offline, storing point locally:", err);

            //  Only add to unsent queue if we're NOT already retrying
            // if (!isRetryingSend) {
            //     unsentPoints.push({ image_id, x, y, radius, color });
            //     localStorage.setItem("unsentPoints", JSON.stringify(unsentPoints));
            // }
            return false; // Return failure
        }
    }

    
    async function remove_rect(image_id, x1, y1, x2, y2) {
        // const point = { image_id, x, y, radius, color, transparency };
        try {
            const response = await fetch(`/remove_egg_from_db_rect/${image_id}/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": getCSRFToken("csrftoken"),
                    },
                    body: JSON.stringify({ x1, y1, x2, y2 })
                });

                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                } else{
                    totalEggs--;
                }

                const data = await response.json();
                console.log("Server says:", data.message || data.STATUS);

                // SUCCESS: Remove ghost point
                // removeGhostPoint(x, y, image_id);
                setTotalEggCount();
                return true; // Return success
        } catch (err) {
            console.warn("Deletion failed, keeping ghost point:", err);

            // //  Keep ghost + add to retry queue (ONLY if not already retrying)
            // if (!isRetrying) {
            //     unsentRemovals.push(point);
            //     localStorage.setItem("unsentRemovals", JSON.stringify(unsentRemovals));
            // }
            return false; // Return failure
        }
    }


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

        



})