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

    /* Point Storage */
    const drawnPoints = [];

    const pointsData = document.getElementById("points-data");
    const points = JSON.parse(pointsData.dataset.points || "[]");

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
        points.forEach(p => {
            console.log("Drawing Point!",p.x,p.y)
            drawPoint(p.x, p.y);
        });
    }

    // This function draws the grids over time image.
    function drawGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;

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

    /* This part handles the zoom logic */
    container.addEventListener('wheel', (e) => {
        e.preventDefault(); // prevent scroll of window
        // This checks maximum zoom out
        if(scale >= minScale){
            const delta = -e.deltaY * 0.0001; 
            zoomVelocity += delta;
            console.log("ZOOM VEL" + zoomVelocity);

            isZooming = true;
            requestAnimationFrame(applyZoom);

        } else{
            // This solves potential scenario where controls suddenly gets stuck.
            scale = minScale;
        }

    }, { passive: false });

    function applyZoom() {
        // This is the brake of the zoom
        if (Math.abs(zoomVelocity) < 0.001) {
            zoomVelocity = 0;
            isZooming = false;
            console.log("BRAKE!");
            return;
        }

        // Calculate world (pre-zoom) coordinates BEFORE updating scale
        const newScale = scale * (1 + zoomVelocity);
        const zoomCenterX = (translateX) / scale;
        const zoomCenterY = (translateY) / scale;

        // Set new scale
        scale = Math.max(newScale,minScale);
        
        // Adjust pan so zoom stays centered on where the image is placed at.
        translateX = zoomCenterX * scale;
        translateY = zoomCenterY * scale;

        // Snap to default if extremely close to min
        if (Math.abs(scale - minScale) < tolerance_reset) {
            translateX = 0;
            translateY = 0;
        }

        updateTransform();

        // Decay zoom velocity (Higher value leads to weaker brakes)
        zoomVelocity *= 0.91;

        requestAnimationFrame(applyZoom);
    }

    // Track last mouse position over the image (Useful for finding exact pixel)
    img.addEventListener('mousemove', function (e) {
        const rect = img.getBoundingClientRect();
        lastMouseX = e.clientX - rect.left;
        lastMouseY = e.clientY - rect.top;
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
        // Setting this to 0 eliminates the drifting bug.
        zoomVelocity = 0;
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
        if (e.key.toLowerCase() === 'w') {
            const relativeX = (lastMouseX) / scale;
            const relativeY = (lastMouseY) / scale;

            console.log(`Mapped X: ${relativeX}, Y: ${relativeY}`);
            fillGridCell(relativeX, relativeY);
        }
    });

    // Press 'e' to create a point
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

                const rect = img.getBoundingClientRect();

                // Use last known position
                const clickX = lastMouseX;
                const clickY = lastMouseY;

                const scaleX = img.naturalWidth / rect.width;
                const scaleY = img.naturalHeight / rect.height;

                const pixelX = Math.floor(clickX * scaleX);
                const pixelY = Math.floor(clickY * scaleY);
                
                edges.push([pixelX, pixelY]);
                
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

                const rect = img.getBoundingClientRect();

                // Use last known position
                const clickX = lastMouseX;
                const clickY = lastMouseY;

                const scaleX = img.naturalWidth / rect.width;
                const scaleY = img.naturalHeight / rect.height;

                const pixelX = Math.floor(clickX * scaleX);
                const pixelY = Math.floor(clickY * scaleY);
                drawPoint(pixelX, pixelY);
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
            const rect = img.getBoundingClientRect();

            // Use last known position
            const clickX = lastMouseX;
            const clickY = lastMouseY;

            const scaleX = img.naturalWidth / rect.width;
            const scaleY = img.naturalHeight / rect.height;

            const pixelX = Math.floor(clickX * scaleX);
            const pixelY = Math.floor(clickY * scaleY);
            erasePointAtCursor(pixelX,pixelY);
        }
    });

        // Press 'k' to erase a rect
    window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'k') {
            const rect = img.getBoundingClientRect();

            // Use last known position
            const clickX = lastMouseX;
            const clickY = lastMouseY;

            const scaleX = img.naturalWidth / rect.width;
            const scaleY = img.naturalHeight / rect.height;

            const pixelX = Math.floor(clickX * scaleX);
            const pixelY = Math.floor(clickY * scaleY);
            removeRectOptimized(pixelX,pixelY);
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
            ctx.clearRect(cellX, cellY, gridSize, gridSize);
            ctx.drawImage(img, cellX, cellY, gridSize, gridSize, cellX, cellY, gridSize, gridSize);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.strokeRect(cellX, cellY, gridSize, gridSize);
        } else {
            // Toggle on
            filledCells.add(key);
            //ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'; // White
            ctx.fillStyle = 'rgba(0, 255, 0, 0.4)'; // Greenish
            ctx.fillRect(cellX, cellY, gridSize, gridSize);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.strokeRect(cellX, cellY, gridSize, gridSize);
        }
    }

    // This function draws a point.
    function drawPoint(x, y, color = 'green', radius = 5) {
        if(!isDragging && !isZooming){
            dtx.beginPath();
            dtx.arc(x, y, radius, 0, 2 * Math.PI);
            dtx.fillStyle = color;
            dtx.fill();
            
            // Store the point with all its visual properties
            drawnPoints.push({ x, y, color, radius });

            undoQueue.push({x,y,'annotation':'point'});
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


    function erasePointAtCursor(mouseX, mouseY) {
        const threshold = 10;
        const thresholdSq = threshold * threshold;
        let removedPoints = [];
        let affectedArea = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
        
        // Find and remove points, tracking the affected area
        for (let i = drawnPoints.length - 1; i >= 0; i--) {
            const pt = drawnPoints[i];
            const dx = pt.x - mouseX;
            const dy = pt.y - mouseY;
            const distSq = dx * dx + dy * dy;
            
            if (distSq <= thresholdSq) {
                removedPoints.push(pt);
                drawnPoints.splice(i, 1);
                
                // Expand affected area
                const pointRadius = pt.radius || 5;
                affectedArea.minX = Math.min(affectedArea.minX, pt.x - pointRadius);
                affectedArea.minY = Math.min(affectedArea.minY, pt.y - pointRadius);
                affectedArea.maxX = Math.max(affectedArea.maxX, pt.x + pointRadius);
                affectedArea.maxY = Math.max(affectedArea.maxY, pt.y + pointRadius);
            }
        }
        
        // Only redraw if points were removed
        if (removedPoints.length > 0) {
            // Add some padding to the clear area
            const padding = 2;
            const clearWidth = affectedArea.maxX - affectedArea.minX + padding * 2;
            const clearHeight = affectedArea.maxY - affectedArea.minY + padding * 2;
            
            // Clear the affected area
            dtx.clearRect(
                affectedArea.minX - padding, 
                affectedArea.minY - padding, 
                clearWidth, 
                clearHeight
            );
            
            // Redraw any remaining points that overlap with the cleared area
            for (const point of drawnPoints) {
                const pointRadius = point.radius || 5;
                if (point.x + pointRadius >= affectedArea.minX - padding &&
                    point.x - pointRadius <= affectedArea.maxX + padding &&
                    point.y + pointRadius >= affectedArea.minY - padding &&
                    point.y - pointRadius <= affectedArea.maxY + padding) {
                    
                    dtx.beginPath();
                    dtx.arc(point.x, point.y, point.radius, 0, 2 * Math.PI);
                    dtx.fillStyle = point.color;
                    dtx.fill();
                }
            }
        }
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
        // points.forEach(p => {
        //     drawPoint(parseInt(p[0]), parseInt(p[1]));
        // });
    }

    // Recalculate when window resizes
    window.addEventListener("resize", resizeImageToContainer);

    // Also when fullscreen changes
    document.addEventListener("fullscreenchange", resizeImageToContainer);

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            updateTransform(); // redraw immediately
            requestAnimationFrame(() => {}); // force a warm frame
        }
    });


    // Section related to menu...
    const pointBtn = document.getElementById("point-btn");
    const rectBtn = document.getElementById("rect-btn");
    const undoBtn = document.getElementById("undo-btn");

    pointBtn.addEventListener("click", (e) => {
        isPointAnnotate = true;
        isRectAnnotate = false;
        dropdown.style.display = "none";
    })

    rectBtn.addEventListener("click",(e)=>{
        isRectAnnotate = true;
        isPointAnnotate = false;
        dropdown.style.display = "none";
    })


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


})
