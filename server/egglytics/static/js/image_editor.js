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

    function getMouseImagePosition(event) {
        const viewportPoint = viewer.viewport.pointFromPixel(event.position);
        const imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);

        return {
            x: Math.round(imagePoint.x),
            y: Math.round(imagePoint.y)
        };
    }

        






})