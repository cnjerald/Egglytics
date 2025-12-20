$(document).ready(function () {
 let points = [];
    let lastMousePos = null;
    let viewerReady = false;

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

    // Pressing E draws a point at last mouse position
    document.addEventListener("keydown", (e) => {
        if (e.key.toLowerCase() === "e") {
            console.log("--- E key pressed ---");
            const pos = getMousePosition();
            if (!pos) {
                console.log(" Could not get mouse position");
                return;
            }

            console.log("✓ Mouse position:", pos.x, pos.y);
            drawPoint(pos.x, pos.y, "lime", 12);
        }
    });

    
    // Listen for 'R' key
    document.addEventListener("keydown", (e) => {
        if (e.key.toLowerCase() === "r") {
            removePointAtCursor();
        }
    });

    // Draws a point in the canvas
    function drawPoint(x, y, color = "lime", size = 10) {
        if (!viewerReady) return;

        const tiledImage = viewer.world.getItemAt(0);
        const vpPoint = tiledImage.imageToViewportCoordinates(x, y);

        const halfSize = size / 2; // Calculate half the size for centering

        const dot = document.createElement("div");
        dot.style.width = size + "px";
        dot.style.height = size + "px";
        dot.style.background = color;
        dot.style.border = "2px solid white";
        dot.style.borderRadius = "50%";
        dot.style.position = "absolute";
        dot.style.pointerEvents = "none";
        dot.style.boxSizing = "border-box";

        // *** This fix the offset made by the openseadragon (Credit to Gemini)
        // This tells the element to visually shift up and left by half its size,
        // making its geometric center align with the OSD-placed top-left corner.
        dot.style.marginTop = -halfSize + "px";
        dot.style.marginLeft = -halfSize + "px";

        // Add overlay to the viewer
        viewer.addOverlay({
            element: dot,
            location: vpPoint,
        });

        points.push({
            x: x,
            y: y,
            size: size,
            element: dot,
            color: color
        });
    }

    // Remove point under cursor
    function removePointAtCursor() {
        const pos = getMousePosition(); // your function that returns {x, y} in image coordinates
        if (!pos) return;

        const tolerance = 10; // pixels around cursor to remove

        // Find the first dot close enough
        for (let i = 0; i < points.length; i++) {
            const pt = points[i];
            const dx = pt.x - pos.x;
            const dy = pt.y - pos.y;

            if (Math.sqrt(dx*dx + dy*dy) <= tolerance) {
                // Remove overlay
                viewer.removeOverlay(pt.element);
                points.splice(i, 1); // remove from array
                break;
            }
        }
    }


    let isRectAnnotate = true;
    let edges = [];            // [[x1,y1], [x2,y2]]
    let previewRect = null;    // overlay element
    const rects = []; // store all rectangles

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

    viewer.addOverlay({
        element: rectEl,
        location: new OpenSeadragon.Rect(
            vpTL.x,
            vpTL.y,
            vpBR.x - vpTL.x,
            vpBR.y - vpTL.y
        )
    });

    //  store rectangle in IMAGE coordinates
    rects.push({
        x: minX,
        y: minY,
        width,
        height,
        element: rectEl
    });
}


        
    window.addEventListener("keydown", (e) => {
        if (e.key.toLowerCase() === "q") {
            isRectAnnotate = true;   //  REQUIRED
            const pos = getMousePosition();
            if (!pos) return;

            edges.push([pos.x, pos.y]);

            if (edges.length === 1) {
                console.log("First corner placed");
            } else if (edges.length === 2) {
                hidePreviewRect();
                drawRectOSD(edges);
                edges = [];
                isRectAnnotate = false; // optional auto-exit
            }
        }
    });

    function isPointInsideRect(px, py, rect) {
        return (
            px >= rect.x &&
            px <= rect.x + rect.width &&
            py >= rect.y &&
            py <= rect.y + rect.height
        );
    }

    window.addEventListener("keydown", (e) => {
        if (e.key.toLowerCase() !== "k") return;

        const pos = getMousePosition(); // image coordinates
        if (!pos) return;

        for (let i = rects.length - 1; i >= 0; i--) {
            const r = rects[i];

            if (isPointInsideRect(pos.x, pos.y, r)) {
                viewer.removeOverlay(r.element);
                rects.splice(i, 1);
                console.log(" Rectangle deleted");
                break; // remove only one
            }
        }
    });


    function getMouseImagePosition(event) {
        const viewportPoint = viewer.viewport.pointFromPixel(event.position);
        const imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);

        return {
            x: Math.round(imagePoint.x),
            y: Math.round(imagePoint.y)
        };
    }

    let gridOverlays = [];
    let gridSize = 512; // image pixels per cell
    let filledCells = new Map(); // key -> overlay element


    function drawGrid() {
        if (!viewerReady) return;

        clearGrid();

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
                    0.0005, // thin width in viewport coords
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
                    0.0005 // thin height
                )
            });

            gridOverlays.push(line);
        }

        console.log("✓ Grid drawn");
    }

    function clearGrid() {
            gridOverlays.forEach(el => viewer.removeOverlay(el));
            gridOverlays = [];
        }

        let gridVisible = false;

        window.addEventListener("keydown", (e) => {
            if (e.key.toLowerCase() !== "g") return;

            gridVisible = !gridVisible;

            if (gridVisible) {
                drawGrid();
            } else {
                clearGrid();
            }
        });

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

    window.addEventListener("keydown", (e) => {
        if (e.key.toLowerCase() !== "f") return;

        const pos = getMousePosition();
        if (!pos) return;

        fillGridCell(pos.x, pos.y);
    });








        






})