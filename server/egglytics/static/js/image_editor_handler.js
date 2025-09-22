$(document).ready(function () {

    const container = document.getElementById('photo');
    const wrapper = document.getElementById('zoom-wrapper');
    const img = document.getElementById("image");

    /* Grids */
    const filledCells = new Set();
    const canvas = document.getElementById('grid-canvas');
    const ctx = canvas.getContext('2d');
    const gridSize = 500;

    const dot_canvas = document.getElementById('dot-canvas');
    const dtx = dot_canvas.getContext('2d');

    /* Initial Image Resize */
    let scale = 1;
    let minScale = 0;
    let maxScale = 0;
    let tolerance_reset = 0;
    let zoomVelocity = 0;

    /* Translation X and Y*/
    let translateX = 0;
    let translateY = 0;

    /* States */
    let isDragging = false;
    let isZooming = false;
    let eKeyIsDown = false;

    let isRectAnnotate = false;
    let isPointAnnotate = true;
    let startX = 0;
    let startY = 0;
    let lastMouseX = 0;
    let lastMouseY = 0;
    

    let mouseX = 0;
    let mouseY = 0;
    
    let lastImageX = 0, lastImageY = 0;   // pointer in image pixel coords (natural image space)

    /* Point Storage */
    const drawnPoints = []; // NOTE TO SELF (JERALD) CONVERT THIS TO SET TO PREVENT DUPLICATES!
    const drawnRects = [];

    // Keep unsent points in memory (can also use localStorage for persistence)
    let unsentPoints = JSON.parse(localStorage.getItem("unsentPoints") || "[]");

    /* Rescale image */
    const containerRect = container.getBoundingClientRect();
    const imgNaturalWidth = img.naturalWidth;
    const imgNaturalHeight = img.naturalHeight;
    
    const scaleX = containerRect.width / imgNaturalWidth;
    const scaleY = containerRect.height / imgNaturalHeight;

    minScale = Math.min(scaleX, scaleY);
    scale = minScale;
    maxScale = minScale + 1;
    tolerance_reset = maxScale * 0.005;

    canvas.width = img.width;
    canvas.height = img.height;

    dot_canvas.width = img.width;
    dot_canvas.height = img.height;
    
    /* Queues (Undo and Redo) */
    let undoQueue = [];
    let redoQueue = [];

    // Apply scales, resize, and transformations
    updateTransform();
    // Draw initial points
    drawPoints(points);



    // Toggle grids when checkbox is changed
    document.getElementById("temp").addEventListener("change", function () {
        if (this.checked) {
            canvas.style.display = "block";  // show grid canvas
            drawGrid(); // redraw grid lines
        } else {
            canvas.style.display = "none";   // hide grid canvas
        }
    });

    // This function draws the points in the canvas
    function drawPoints(points){
        console.log(points.length);
        points.forEach(p => {
            //console.log("Drawing Point!",p.x,p.y)
            drawPoint(p.x, p.y, 'green', 5, false, true);
        });
        console.log(drawnPoints.length);
    }


    // This function draws the grids over time image.
    function drawGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 10;

        // Vertical lines
        for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
        }
    }

    // This updates the image based on 
    // (1) Translation 
    // (2) Zoom/Scale
    function updateTransform() {
        wrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    }

    let lastWheelEvent = null;

    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        lastWheelEvent = e;  // ✅ save event for later use
        isDragging = false;
        container.style.cursor = 'n-resize';


        if (scale >= minScale) {
            const delta = -e.deltaY * 0.0001;
            zoomVelocity += delta;

            isZooming = true;
            requestAnimationFrame(applyZoom);
        } else {
            scale = minScale;
        }
    }, { passive: false });

    function applyZoom() {
        if (Math.abs(zoomVelocity) < 0.001) {
            zoomVelocity = 0;
            isZooming = false;

            // ✅ Do pixel computation only after brake
            if (lastWheelEvent) {
                const rect = img.getBoundingClientRect();
                const mouseX = lastWheelEvent.clientX - rect.left;
                const mouseY = lastWheelEvent.clientY - rect.top;

                let px = (mouseX) / scale;
                let py = (mouseY) / scale;
                container.style.cursor = 'crosshair';

                if (!isNaN(px) && !isNaN(py)) {
                    lastMouseX = Math.max(0, Math.min(img.naturalWidth, px));
                    lastMouseY = Math.max(0, Math.min(img.naturalHeight, py));

                    // console.log(
                    //     "Image Pixel ZOOM:",
                    //     Math.floor(lastMouseX),
                    //     Math.floor(lastMouseY)
                    // );
                }
            }
            return;
        }

        const newScale = scale * (1 + zoomVelocity);

        const zoomCenterX = translateX / scale;
        const zoomCenterY = translateY / scale;

        scale = newScale;

        translateX = zoomCenterX * scale;
        translateY = zoomCenterY * scale;

        updateTransform();
        zoomVelocity *= 0.95;
        requestAnimationFrame(applyZoom);
    }


    // Track last mouse position in actual image pixel coordinates
    img.addEventListener('mousemove', function (e) {

        const rect = img.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Convert to actual image pixels
        lastMouseX = mouseX / scale;
        lastMouseY = mouseY / scale;

        lastMouseX = Math.max(0, Math.min(img.naturalWidth, lastMouseX));
        lastMouseY = Math.max(0, Math.min(img.naturalHeight, lastMouseY));


        // // Debug
        // console.log("Image Pixel:", Math.floor(lastMouseX), Math.floor(lastMouseY));
    });

    


    // This disable annoying popup when right clicking on the image
    container.addEventListener("contextmenu", (e) => e.preventDefault());
    // Event listener of middle button hold to pan the image
    container.addEventListener('mousedown', function (e) {
        if (e.button !== 2) return;
        if (edges.length == 1){
            cancelRectangleAnnotation();
            return;
        }

        isDragging = true;
        container.style.cursor = 'grabbing';
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
    });

    // This is to return the cursor from 'grabbing' state to 'crosshair' state
    window.addEventListener('mouseup', function () {
        isDragging = false;
        container.style.cursor = 'crosshair';
    });
    // This updates the translation of the image in case a pan was made.
    container.addEventListener('mousemove', function (e) {
        if (!isDragging) return;
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        updateTransform();
    });

    // Listen for key press (Q)
    window.addEventListener('keydown', function (e) {
        if (e.key.toLowerCase() === 'q') {
            const rect = img.getBoundingClientRect();

            // Use last known position
            const clickX = lastMouseX;
            const clickY = lastMouseY;

            const scaleX = img.naturalWidth / rect.width;
            const scaleY = img.naturalHeight / rect.height;

            const pixelX = Math.floor(clickX * scaleX);
            const pixelY = Math.floor(clickY * scaleY);

            alert(`Pressed Q at pixel: (${pixelX}, ${pixelY})`);
        }
    });

    // Press 'w' to shade the hovered grid cell
    window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'w' && !isZooming && !isDragging) {
            fillGridCell(Math.floor(lastMouseX), Math.floor(lastMouseY));
        }
    });

    let edges = [];
    let previewRect = null; // Store preview rectangle element

    // Function to create and update preview rectangle
    function updatePreviewRect(startX, startY, endX, endY) {
        const rect = img.getBoundingClientRect();
        
        // Convert back to screen coordinates for preview
        const scaleX = rect.width / img.naturalWidth;
        const scaleY = rect.height / img.naturalHeight;
        
        const screenX1 = startX * scaleX;
        const screenY1 = startY * scaleY;
        const screenX2 = endX * scaleX;
        const screenY2 = endY * scaleY;
        
        const left = Math.min(screenX1, screenX2) + rect.left;
        const top = Math.min(screenY1, screenY2) + rect.top;
        const width = Math.abs(screenX2 - screenX1);
        const height = Math.abs(screenY2 - screenY1);
        
        if (!previewRect) {
            previewRect = document.createElement('div');
            previewRect.style.position = 'fixed';
            previewRect.style.border = '2px dashed #ff6b6b';
            previewRect.style.backgroundColor = 'rgba(255, 107, 107, 0.1)';
            previewRect.style.pointerEvents = 'none';
            previewRect.style.zIndex = '9999';
            previewRect.style.boxSizing = 'border-box';
            document.body.appendChild(previewRect);
        }
        
        previewRect.style.left = `${left}px`;
        previewRect.style.top = `${top}px`;
        previewRect.style.width = `${width}px`;
        previewRect.style.height = `${height}px`;
        previewRect.style.display = 'block';
    }

    // Mouse move handler for preview (only active during rectangle annotation)
    function handleMouseMovePreview(e) {
        if (isRectAnnotate && edges.length === 1) {
            const rect = img.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const scaleX = img.naturalWidth / rect.width;
            const scaleY = img.naturalHeight / rect.height;
            
            const pixelX = Math.floor(mouseX * scaleX);
            const pixelY = Math.floor(mouseY * scaleY);
            
            updatePreviewRect(edges[0][0], edges[0][1], pixelX, pixelY);
        }
    }

    // Add mouse move listener for preview
    document.addEventListener('mousemove', handleMouseMovePreview);

    window.addEventListener('keydown', (e) => {
        requestAnimationFrame(applyZoom);
        if (e.key.toLowerCase() === 'e' && !eKeyIsDown) {
            if(isRectAnnotate){
                eKeyIsDown = true;
                edges.push([Math.floor(lastMouseX), Math.floor(lastMouseY)]);
                
                if(edges.length === 1) {
                    // First point - start showing preview
                    console.log('First corner placed, move mouse to see rectangle preview');
                } else if(edges.length === 2) {
                    // Second point - complete rectangle and hide preview
                    hidePreviewRect();
                    drawRect(edges);
                    edges = [];
                }

            } else if(isPointAnnotate){                  
                eKeyIsDown = true;                 
                console.log("DRAWING AT:",Math.floor(lastMouseX),Math.floor(lastMouseY));                 
                drawPoint(Math.floor(lastMouseX), Math.floor(lastMouseY),'red');
            }     
        }
    });

    // For future use
    function cancelRectangleAnnotation() {
        edges = [];
        hidePreviewRect();
    }

    // Function to hide preview rectangle
    function hidePreviewRect() {
        if (previewRect) {
            previewRect.style.display = 'none';
        }
    }

    // This prevents the creation of multiple points when holding 'e' key
    window.addEventListener('keyup', (e) => {
        if (e.key.toLowerCase() === 'e') {
            eKeyIsDown = false;
        }
    });
    // Press 'r' to erase a point
    window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'r') {
            erasePointAtCursor(Math.floor(lastMouseX), Math.floor(lastMouseY));
        }
    });

        // Press 'k' to erase a rect
    window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'k') {

            removeRectOptimized(Math.floor(lastMouseX), Math.floor(lastMouseY));
        }
    });


    // This function fills a grid cell by a shade of white to record it as completed, user can also unfill it.
    function fillGridCell(x, y) {
        const col = Math.floor(x / gridSize);
        const row = Math.floor(y / gridSize);
        const key = `${col},${row}`;

        const cellX = col * gridSize;
        const cellY = row * gridSize;

        if (filledCells.has(key)) {
            // Toggle off
            filledCells.delete(key);
            // Clear the cell by redrawing from the image
            ctx.clearRect(cellX+5, cellY+5, gridSize-10, gridSize-10);

        } else {
            // Toggle on
            filledCells.add(key);
            //ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'; // White
            ctx.fillStyle = 'rgba(0, 255, 0, 0.4)'; // Greenish
            ctx.fillRect(cellX+5, cellY+5, gridSize-10, gridSize-10);

        }
    }

    // This function draws a point.

    // This function draws a point.
    function drawPoint(x, y, color = 'green', radius = 5, isResized = false, isInitial = false) {
        if(!isDragging){

            try{
                dtx.beginPath();
                dtx.arc(x, y, radius, 0, 2 * Math.PI);
                dtx.fillStyle = color;
                dtx.fill();
            } catch{
                console.log(e,"err");
            }

            // Store the point with all its visual properties
            if(!isResized){
                drawnPoints.push({ x, y, color, radius });
                undoQueue.push({x,y,'annotation':'point'});
            }

            if (!isInitial) {
                sendPoint(image_id,x,y)
            }
        }
    }

    // This function draws a rectangle given two corner points 
    function drawRect(edges, color = 'red', lineWidth = 2) {
        if (edges.length !== 2) return; // need exactly two corners

        const [x1, y1] = edges[0];
        const [x2, y2] = edges[1];

        // Calculate the actual rectangle bounds (normalize negative dimensions)
        // This is important as the delete rect logic relies on positive dimensions..
        const minX = Math.min(x1, x2);
        const minY = Math.min(y1, y2);
        const maxX = Math.max(x1, x2);
        const maxY = Math.max(y1, y2);
        
        const width = maxX - minX;
        const height = maxY - minY;

        // Draw the rectangle using the normalized coordinates
        dtx.beginPath();
        dtx.rect(minX, minY, width, height);
        dtx.strokeStyle = color;
        dtx.lineWidth = lineWidth;
        dtx.stroke();

        // Store it with normalized coordinates
        if (!window.drawnRects) {
            window.drawnRects = [];
        }
        drawnRects.push({ 
            x: minX, 
            y: minY, 
            width, 
            height, 
            color, 
            lineWidth 
        });
    }

     // Function to redraw all rectangles
    function redrawAllRects() {
        for (const rect of drawnRects) {
            dtx.beginPath();
            dtx.rect(rect.x, rect.y, rect.width, rect.height);
            dtx.strokeStyle = rect.color;
            dtx.lineWidth = rect.lineWidth;
            dtx.stroke();
        }
    }

    // Ultra-safe version: For when you absolutely need it to work correctly
    function removeRectOptimized(mouseX, mouseY) {
        if (!window.drawnRects) return;
        
        const threshold = 5;
        let rectsRemoved = false;
        
        // Remove rectangles that contain or are near the cursor
        for (let i = drawnRects.length - 1; i >= 0; i--) {
            const rect = drawnRects[i];
            
            if (isPointInRect(mouseX, mouseY, rect, threshold)) {
                drawnRects.splice(i, 1);
                rectsRemoved = true;
            }
        }
        
        // If any rectangles were removed, just redraw everything
        if (rectsRemoved) {
            // Store current canvas state settings
            const currentStrokeStyle = dtx.strokeStyle;
            const currentFillStyle = dtx.fillStyle;
            const currentLineWidth = dtx.lineWidth;
            
            // Clear entire canvas
            dtx.clearRect(0, 0, dtx.canvas.width, dtx.canvas.height);
            
            // Redraw all rectangles
            for (const rect of drawnRects) {
                dtx.beginPath();
                dtx.rect(rect.x, rect.y, rect.width, rect.height);
                dtx.strokeStyle = rect.color;
                dtx.lineWidth = rect.lineWidth;
                dtx.stroke();
            }
            
            // Redraw all points
            if (typeof drawnPoints !== 'undefined' && drawnPoints.length > 0) {
                for (const point of drawnPoints) {
                    dtx.beginPath();
                    dtx.arc(point.x, point.y, point.radius, 0, 2 * Math.PI);
                    dtx.fillStyle = point.color;
                    dtx.fill();
                }
            }
            
            // Restore canvas state
            dtx.strokeStyle = currentStrokeStyle;
            dtx.fillStyle = currentFillStyle;
            dtx.lineWidth = currentLineWidth;
        }
    }

    // Function to check if a point is inside or near a rectangle
    function isPointInRect(mouseX, mouseY, rect, threshold = 5) {
        // Check if point is inside the rectangle
        if (mouseX >= rect.x && mouseX <= rect.x + rect.width &&
            mouseY >= rect.y && mouseY <= rect.y + rect.height) {
            return true;
        }
        
        // Check if point is near the rectangle border (within threshold)
        const nearLeft = Math.abs(mouseX - rect.x) <= threshold && 
                        mouseY >= rect.y - threshold && mouseY <= rect.y + rect.height + threshold;
        const nearRight = Math.abs(mouseX - (rect.x + rect.width)) <= threshold && 
                        mouseY >= rect.y - threshold && mouseY <= rect.y + rect.height + threshold;
        const nearTop = Math.abs(mouseY - rect.y) <= threshold && 
                        mouseX >= rect.x - threshold && mouseX <= rect.x + rect.width + threshold;
        const nearBottom = Math.abs(mouseY - (rect.y + rect.height)) <= threshold && 
                        mouseX >= rect.x - threshold && mouseX <= rect.x + rect.width + threshold;
        
        return nearLeft || nearRight || nearTop || nearBottom;
    }


    let ghostPoints = [];
    let unsentRemovals = []; // holds points that failed deletion

    function erasePointAtCursor(mouseX, mouseY) {
        const threshold = 10;
        const thresholdSq = threshold * threshold;
        let closestIndex = -1;
        let closestDistSq = Infinity;

        // Find the closest point within the threshold
        for (let i = 0; i < drawnPoints.length; i++) {
            const pt = drawnPoints[i];
            const dx = pt.x - mouseX;
            const dy = pt.y - mouseY;
            const distSq = dx * dx + dy * dy;

            if (distSq <= thresholdSq && distSq < closestDistSq) {
                closestDistSq = distSq;
                closestIndex = i;
            }
        }

        // If we found one, remove and redraw
        if (closestIndex !== -1) {
            const pt = drawnPoints.splice(closestIndex, 1)[0];
            console.log("Removed point at:", image_id, pt);
            remove_egg_from_db(image_id, pt.x, pt.y);

            // Save as ghost point
            ghostPoints.push(pt);
            console.log(pt);
            console.log(ghostPoints);

            // Clear a small area around the removed point
            const pointRadius = pt.radius || 5;
            const padding = 2;
            const clearSize = (pointRadius + padding) * 2;

            dtx.clearRect(
                pt.x - pointRadius - padding,
                pt.y - pointRadius - padding,
                clearSize,
                clearSize
            );

            // Redraw normal points overlapping the cleared area
            for (const point of drawnPoints) {
                const r = point.radius || 5;
                if (
                    point.x + r >= pt.x - pointRadius - padding &&
                    point.x - r <= pt.x + pointRadius + padding &&
                    point.y + r >= pt.y - pointRadius - padding &&
                    point.y - r <= pt.y + pointRadius + padding
                ) {
                    dtx.beginPath();
                    dtx.arc(point.x, point.y, r, 0, 2 * Math.PI);
                    dtx.fillStyle = point.color;
                    dtx.fill();
                }
            }

            // Redraw ghost points overlapping the cleared area
            for (const gpt of ghostPoints) {
                const gr = gpt.radius || 5;
                if (
                    gpt.x + gr >= pt.x - pointRadius - padding &&
                    gpt.x - gr <= pt.x + pointRadius + padding &&
                    gpt.y + gr >= pt.y - pointRadius - padding &&
                    gpt.y - gr <= pt.y + pointRadius + padding
                ) {
                    dtx.save();
                    dtx.globalAlpha = 0.4; // ghost transparency
                    dtx.beginPath();
                    dtx.arc(gpt.x, gpt.y, gr, 0, 2 * Math.PI);
                    dtx.fillStyle = gpt.color;
                    dtx.fill();
                    dtx.restore();
                }
            }

            redrawAllRects();
        }
    }



    // Function to redraw all canvas elements (points, lines, etc.)
    function redrawCanvas() {
        // Clear the canvas
        dtx.clearRect(0, 0, dtx.width, dtx.height);
        
        // Redraw all points with their current colors
        drawnPoints.forEach(point => {
            dtx.beginPath();
            dtx.arc(point.x, point.y, point.radius, 0, 2 * Math.PI);
            dtx.fillStyle = point.color;
            dtx.fill();
        });
        
        // Redraw rectangles and other elements
        redrawAllRects();
    }

    function resizeImageToContainer() {
        const containerRect = container.getBoundingClientRect();

        const scaleX = containerRect.width / imgNaturalWidth;
        const scaleY = containerRect.height / imgNaturalHeight;

        minScale = Math.min(scaleX, scaleY);
        scale = minScale;
        maxScale = minScale + 1;
        tolerance_reset = maxScale * 0.005;

        translateX = 0;
        translateY = 0;

        canvas.width = img.width;
        canvas.height = img.height;

        dot_canvas.width = img.width;
        dot_canvas.height = img.height;

        updateTransform();
        redrawCanvas();
    }

    // Recalculate when window resizes
    window.addEventListener("resize", resizeImageToContainer);

    // Also when fullscreen changes
    document.addEventListener("fullscreenchange", resizeImageToContainer);

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            requestAnimationFrame(() => {}); // force a warm frame
            updateTransform(); // redraw immediately
            console.log("Redrawing canvas!");
            redrawCanvas();
            
        }
    });


    // Section related to menu...
    const undoBtn = document.getElementById("undo-btn");

    $("#point-btn").on("click", function (e) {
        isPointAnnotate = true;
        isRectAnnotate = false;
        $("#edit-dropdown").toggle();
    });

    $("#rect-btn").on("click", function (e) {
        isRectAnnotate = true;
        isPointAnnotate = false;
        $("#edit-dropdown").toggle();
    });


    undoBtn.addEventListener("click", (e) => {
        if (undoQueue.length > 0) {
            // pop removes the last element from the queue
            const lastElement = undoQueue.pop();
            console.log("Undoing:", lastElement);

            if (lastElement.annotation === 'point') {
                erasePointAtCursor(lastElement.x, lastElement.y);
                console.log("REMOVED");
            }
        } else {
            console.log("Undo queue is empty!");
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


    async function sendPoint(image_id, x, y, radius = 5, color = 'red') {
        try {
            const response = await fetch(`/add_egg_to_db/${image_id}/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCSRFToken("csrftoken"),
                },
                body: JSON.stringify({ x, y })
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();
            console.log("Server says:", data.message || data.STATUS);
            
            // SUCCESS: Find the point in drawnPoints and update it to green
            const pointIndex = drawnPoints.findIndex(point => 
                Math.abs(point.x - x) < 2 && Math.abs(point.y - y) < 2 && point.color === color
            );
            
            if (pointIndex !== -1) {
                drawnPoints[pointIndex].color = 'green';
                redrawCanvas(); // Redraw the entire canvas with updated colors
            }

        } catch (err) {
            console.error("Server offline, storing point locally:", err);

            unsentPoints.push({ image_id, x, y, radius, color });
            localStorage.setItem("unsentPoints", JSON.stringify(unsentPoints));
        }
    }

    // --- Remove egg request ---
    async function remove_egg_from_db(image_id, x, y, radius = 5, color = 'red', transparency = 0.5) {
        const point = { image_id, x, y, radius, color, transparency };

        try {
            const response = await fetch(`/remove_egg_from_db/${image_id}/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCSRFToken("csrftoken"),
                },
                body: JSON.stringify({ x, y })
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();
            console.log("Server says:", data.message || data.STATUS);

            // SUCCESS: Remove ghost point
            removeGhostPoint(x, y, image_id);
            return true; // Return success

        } catch (err) {
            console.warn("Deletion failed, keeping ghost point:", err);

            // ⏸️ Keep ghost + add to retry queue (ONLY if not already retrying)
            if (!isRetrying) {
                unsentRemovals.push(point);
                localStorage.setItem("unsentRemovals", JSON.stringify(unsentRemovals));
            }
            return false; // Return failure
        }
    }

    setInterval(async () => {
        if (unsentPoints.length > 0) {
            console.log("Retrying unsent points...");

            const stillUnsent = [];

            for (let point of unsentPoints) {
                if (
                    point &&
                    typeof point.x === "number" && !isNaN(point.x) &&
                    typeof point.y === "number" && !isNaN(point.y)
                ) {
                    try {
                        await sendPoint(point.image_id, point.x, point.y, point.radius, point.color);
                        // Point will turn green inside sendPoint if successful
                    } catch {
                        stillUnsent.push(point); // keep if still failing
                    }
                } else {
                    console.warn("Skipping invalid point:", point);
                }
            }

            unsentPoints = stillUnsent;
            localStorage.setItem("unsentPoints", JSON.stringify(unsentPoints));
        }
    }, 5000);


    // --- Separate function for removing ghost points ---
    function removeGhostPoint(x, y, image_id) {
        ghostPoints.forEach(gpt => {
            console.log("DEBUG before filter:", gpt.x, gpt.y);
        });

        let removedGhost = null;


        // Filter out the matching ghost
        ghostPoints = ghostPoints.filter(gpt => {
            if (gpt.x === x && gpt.y === y) {
                removedGhost = gpt; // keep a reference
                return false;       // drop it from the array
            }
            return true; // keep all others
        });

        // If we actually removed one, clear its area
        if (removedGhost) {
            const pointRadius = removedGhost.radius || 5;
            const padding = 2;
            const clearSize = (pointRadius + padding) * 2;

            dtx.clearRect(
                removedGhost.x - pointRadius - padding,
                removedGhost.y - pointRadius - padding,
                clearSize,
                clearSize
            );

            console.log("Cleared ghost at:", removedGhost.x, removedGhost.y);
            redrawCanvas();
        }



        console.log("DEBUG! AFTER FILTER", ghostPoints);
    }

    // --- Separate retry function (doesn't call main remove function) ---
    async function retryRemoveEgg(point) {
        try {
            const response = await fetch(`/remove_egg_from_db/${point.image_id}/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCSRFToken("csrftoken"),
                },
                body: JSON.stringify({ x: point.x, y: point.y })
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();
            console.log("Retry success:", data.message || data.STATUS);

            // SUCCESS: Remove ghost point
            removeGhostPoint(point.x, point.y, point.image_id);
            return true;

        } catch (err) {
            console.warn("Retry failed:", err);
            return false;
        }
    }

    // --- Flag to prevent circular calls ---
    let isRetrying = false;

    // --- Retry loop for failed deletions ---
    setInterval(async () => {
        if (unsentRemovals.length > 0) {
            console.log("Retrying unsent removals...", unsentRemovals.length);
            isRetrying = true; // Set flag

            const stillUnsent = [];

            for (let point of unsentRemovals) {
                if (
                    point &&
                    typeof point.x === "number" && !isNaN(point.x) &&
                    typeof point.y === "number" && !isNaN(point.y)
                ) {
                    const success = await retryRemoveEgg(point);
                    
                    if (!success) {
                        stillUnsent.push(point); // Keep for next retry
                    } else {
                        console.log("Retry success, removed:", point.x, point.y);
                    }
                } else {
                    console.warn("Skipping invalid point:", point);
                }
            }

            unsentRemovals = stillUnsent;
            localStorage.setItem("unsentRemovals", JSON.stringify(unsentRemovals));
            
            isRetrying = false; // Clear flag
        }
    }, 5000);

        

})
