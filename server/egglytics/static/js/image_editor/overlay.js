//
// 
// 
// OPENSEADRAGON OVERLAYS (GRIDS AND RECTANGLE ANNOTATION) MANAGEMENT
// 
// 
// 


export function addOverlay(viewer, element, vpRect, overlayId = null) {
    const config = {
        element: element,
        location: vpRect
    };

    if (overlayId) {
        config.id = overlayId;
    }

    viewer.addOverlay(config);
}

export function removeOverlay(viewer, elementOrId) {
    viewer.removeOverlay(elementOrId);
}

export function updateOverlay(viewer, element, vpRect) {
    viewer.updateOverlay(element, vpRect);
}

export function createOverlayElement(styles = {}) {
    const el = document.createElement("div");
    Object.assign(el.style, styles);
    return el;
}

export function createRectOverlay(viewer, x, y, width, height, color = "red", lineWidth = 2) {
    const tiledImage = viewer.world.getItemAt(0);
    
    const vpTL = tiledImage.imageToViewportCoordinates(x, y);
    const vpBR = tiledImage.imageToViewportCoordinates(x + width, y + height);

    const rectEl = createOverlayElement({
        border: `${lineWidth}px solid ${color}`,
        pointerEvents: "none",
        boxSizing: "border-box"
    });

    const vpRect = new OpenSeadragon.Rect(
        vpTL.x,
        vpTL.y,
        vpBR.x - vpTL.x,
        vpBR.y - vpTL.y
    );

    return { element: rectEl, vpRect };
}

export function createGridLineOverlay(viewer, isVertical, position, imageSize) {
    const tiledImage = viewer.world.getItemAt(0);

    let vpStart, vpEnd, vpRect;

    if (isVertical) {
        vpStart = tiledImage.imageToViewportCoordinates(position, 0);
        vpEnd = tiledImage.imageToViewportCoordinates(position, imageSize.y);
        
        vpRect = new OpenSeadragon.Rect(
            vpStart.x,
            vpStart.y,
            0.0005,
            vpEnd.y - vpStart.y
        );
    } else {
        vpStart = tiledImage.imageToViewportCoordinates(0, position);
        vpEnd = tiledImage.imageToViewportCoordinates(imageSize.x, position);
        
        vpRect = new OpenSeadragon.Rect(
            vpStart.x,
            vpStart.y,
            vpEnd.x - vpStart.x,
            0.0005
        );
    }

    const line = createOverlayElement({
        background: "rgba(0,0,0,0.3)",
        pointerEvents: "none"
    });

    return { element: line, vpRect };
}

export function createGridCellOverlay(viewer, col, row, gridSize, padding = 7) {
    const tiledImage = viewer.world.getItemAt(0);

    const cellX = col * gridSize;
    const cellY = row * gridSize;
    const cellWidth = gridSize - padding;
    const cellHeight = gridSize - padding;

    const vpTL = tiledImage.imageToViewportCoordinates(
        cellX + padding,
        cellY + padding
    );
    const vpBR = tiledImage.imageToViewportCoordinates(
        cellX + padding + cellWidth,
        cellY + padding + cellHeight
    );

    const vpRect = new OpenSeadragon.Rect(
        vpTL.x,
        vpTL.y,
        vpBR.x - vpTL.x,
        vpBR.y - vpTL.y
    );

    const cellEl = createOverlayElement({
        background: "rgba(0, 255, 0, 0.4)",
        pointerEvents: "none",
        boxSizing: "border-box"
    });

    return { element: cellEl, vpRect, key: `${col},${row}` };
}