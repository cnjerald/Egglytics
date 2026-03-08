//
// 
// 
// OPENSEADRAGON INITIALIZATION MANAGEMENT
// 
// 
// 

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





export function setupMouseTracker(viewer, onMoveHandler) {
    const tracker = new OpenSeadragon.MouseTracker({
        element: viewer.canvas,
        moveHandler: onMoveHandler
    });

    return tracker;
}

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

export function imageToViewportCoordinates(viewer, x, y) {
    const tiledImage = viewer.world.getItemAt(0);
    return tiledImage.imageToViewportCoordinates(x, y);
}

export function viewportToPixelCoordinates(viewer, vp) {
    return viewer.viewport.pixelFromPoint(vp, true);
}

export function panToImageCoordinates(viewer, x, y) {
    const tiledImage = viewer.world.getItemAt(0);
    const vp = tiledImage.imageToViewportCoordinates(x, y);
    viewer.viewport.panTo(vp);
}

export function getImageSize(viewer) {
    return viewer.world.getItemAt(0).getContentSize();
}

