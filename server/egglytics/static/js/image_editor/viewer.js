/**
 * -----------------------------------------
 * OPENSEADRAGON INITIALIZATION & UTILS
 * -----------------------------------------
 * Functions to initialize the OpenSeadragon viewer,
 * set up overlay canvases, handle mouse tracking,
 * and coordinate conversions between image, viewport,
 * and pixel coordinates.
 */

/**
 * Initializes an OpenSeadragon viewer.
 *
 * @param {string} imageUrl - URL of the image to load.
 * @returns {OpenSeadragon.Viewer} - Initialized viewer instance.
 */

export function initializeViewer(imageUrl) {
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
        maxZoomPixelRatio: 20,

        // MINIMAP stuff
        showNavigator: true,
        navigatorPosition: "BOTTOM_RIGHT",
        navigatorSizeRatio: 0.2,
        navigatorMaintainSizeRatio: true,
        navigatorBackground: "#000",
        navigatorBorderColor: "#1480ecff",
        navigatorOpacity: 1,
    });

    // Disable default OpenSeadragon keys
    viewer.addHandler('canvas-key', event => {
        if (['q', 'w', 'e', 'r', 'a', 's', 'd', 'f', 'R'].includes(event.originalEvent.key)) {
            event.preventDefaultAction = true;
        }
    });
    
    return viewer;
}

/**
 * Creates an overlay canvas over the viewer for annotations.
 *
 * @param {OpenSeadragon.Viewer} viewer - The OpenSeadragon viewer.
 * @returns {HTMLCanvasElement} - Canvas element attached to the viewer.
 */
export function setupCanvas(viewer) {
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = 0;
    canvas.style.left = 0;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";

    viewer.canvas.appendChild(canvas);

    return canvas;
}

/**
 * Sets up automatic canvas resizing and redraw callbacks.
 *
 * @param {OpenSeadragon.Viewer} viewer - The viewer instance.
 * @param {HTMLCanvasElement} canvas - The overlay canvas.
 * @param {Function} redrawCallback - Function to redraw annotations on resize/zoom/pan.
 * @returns {Function} - The resize handler.
 */
export function setupCanvasResize(viewer, canvas, redrawCallback) {

    function resizeCanvas() {
        const container = viewer.container;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        redrawCallback(); // redraw after size change
    }

    // Image first loads
    viewer.addHandler("open", resizeCanvas);

    // Viewer element size changes
    viewer.addHandler("resize", resizeCanvas);

    // User pans or zooms (continuous)
    viewer.addHandler("animation", redrawCallback);

    // Final viewport state after change
    viewer.addHandler("update-viewport", redrawCallback);

    return resizeCanvas;
}

/**
 * Sets up a mouse tracker for the viewer.
 *
 * @param {OpenSeadragon.Viewer} viewer - The viewer instance.
 * @param {Function} onMoveHandler - Handler for mouse move events.
 * @returns {OpenSeadragon.MouseTracker} - Mouse tracker instance.
 */
export function setupMouseTracker(viewer, onMoveHandler) {
    const tracker = new OpenSeadragon.MouseTracker({
        element: viewer.canvas,
        moveHandler: onMoveHandler
    });

    return tracker;
}

/**
 * Converts the last tracked mouse position to image coordinates.
 *
 * @param {OpenSeadragon.Viewer} viewer - The viewer instance.
 * @param {Object|null} lastMousePos - Last mouse pixel coordinates {x, y}.
 * @returns {Object|null} - Image coordinates {x, y} or null if no position.
 */
export function getMouseImagePosition(viewer, lastMousePos) {
    if (!lastMousePos) {
        console.log("No mouse position tracked yet");
        return null;
    }

    const viewportPoint = viewer.viewport.pointFromPixel(lastMousePos);
    const imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);

    return {
        x: Math.round(imagePoint.x),
        y: Math.round(imagePoint.y)
    };
}

/**
 * Converts image coordinates to viewport coordinates.
 *
 * @param {OpenSeadragon.Viewer} viewer - The viewer instance.
 * @param {number} x - X in image coordinates.
 * @param {number} y - Y in image coordinates.
 * @returns {OpenSeadragon.Point} - Corresponding viewport coordinates.
 */
export function imageToViewportCoordinates(viewer, x, y) {
    const tiledImage = viewer.world.getItemAt(0);
    return tiledImage.imageToViewportCoordinates(x, y);
}

/**
 * Converts viewport coordinates to pixel coordinates on the screen.
 *
 * @param {OpenSeadragon.Viewer} viewer - The viewer instance.
 * @param {OpenSeadragon.Point} vp - Viewport point.
 * @returns {Object} - Pixel coordinates {x, y}.
 */
export function viewportToPixelCoordinates(viewer, vp) {
    return viewer.viewport.pixelFromPoint(vp, true);
}

/**
 * Pans the viewport to a specific image coordinate.
 *
 * @param {OpenSeadragon.Viewer} viewer - The viewer instance.
 * @param {number} x - Image X coordinate.
 * @param {number} y - Image Y coordinate.
 */
export function panToImageCoordinates(viewer, x, y) {
    const tiledImage = viewer.world.getItemAt(0);
    const vp = tiledImage.imageToViewportCoordinates(x, y);
    viewer.viewport.panTo(vp);
}

/**
 * Returns the full image size.
 *
 * @param {OpenSeadragon.Viewer} viewer - The viewer instance.
 * @returns {Object} - Image size {x: width, y: height}.
 */
export function getImageSize(viewer) {
    return viewer.world.getItemAt(0).getContentSize();
}

