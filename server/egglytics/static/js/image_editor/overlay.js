/**
 * OpenSeadragon Overlay Utilities
 * --------------------------------
 * Provides helper functions for creating and managing overlays
 * in an OpenSeadragon viewer.
 *
 * Responsibilities:
 * - Add overlays to the main viewer
 * - Synchronize overlays with the navigator/minimap
 * - Remove or update overlays dynamically
 * - Create overlay elements for rectangles, grid lines, and grid cells
 *
 * These utilities abstract the overlay logic so that higher-level
 * systems (such as GridManager or annotation tools) can easily
 * create and manage visual overlays without directly interacting
 * with OpenSeadragon’s lower-level API.
 *
 * Workflow:
 * Annotation/Grid Event → Create Overlay → Add to Viewer → Update/Remove
 */


/**
 * Adds an overlay to the OpenSeadragon viewer.
 *
 * Purpose:
 * Creates a viewer overlay using the provided DOM element
 * and viewport rectangle coordinates.
 *
 * @param {Object} viewer - OpenSeadragon viewer instance.
 * @param {HTMLElement} element - DOM element used as the overlay.
 * @param {OpenSeadragon.Rect} vpRect - Overlay position in viewport coordinates.
 * @param {string|null} [overlayId=null] - Optional identifier for the overlay.
 */
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

/**
 * Adds an overlay to both the main viewer and the navigator minimap.
 *
 * Purpose:
 * Ensures overlays appear consistently in both the primary
 * viewer and the OpenSeadragon navigator (minimap).
 *
 * Behavior:
 * - Adds the overlay to the main viewer
 * - Creates a cloned element for the minimap
 * - Stores a reference for future removal
 *
 * @param {Object} viewer - OpenSeadragon viewer instance.
 * @param {HTMLElement} element - DOM element used as the overlay.
 * @param {OpenSeadragon.Rect} vpRect - Overlay viewport rectangle.
 * @param {string|null} [overlayId=null] - Optional overlay identifier.
 */
export function addOverlayWithMinimap(viewer, element, vpRect, overlayId = null) {
    // Add to main viewer
    addOverlay(viewer, element, vpRect, overlayId);
    
    // Add to minimap/navigator
    if (viewer.navigator) {
        const minimapElement = element.cloneNode(true);
        viewer.navigator.addOverlay({
            element: minimapElement,
            location: vpRect
        });
        
        // Store reference to minimap element for removal later
        element._minimapElement = minimapElement;
    }
}

/**
 * Removes an overlay from the viewer.
 *
 * Purpose:
 * Removes an overlay element or overlay ID from the viewer.
 * If the overlay also exists in the navigator/minimap,
 * it will be removed there as well.
 *
 * @param {Object} viewer - OpenSeadragon viewer instance.
 * @param {HTMLElement|string} elementOrId - Overlay element or ID.
 */
export function removeOverlay(viewer, elementOrId) {
    // Remove from minimap first if it exists
    if (typeof elementOrId === 'object' && elementOrId._minimapElement && viewer.navigator) {
        viewer.navigator.removeOverlay(elementOrId._minimapElement);
    }
    
    viewer.removeOverlay(elementOrId);
}

/**
 * Updates the position or size of an existing overlay.
 *
 * Purpose:
 * Repositions an overlay in the viewer when its viewport
 * coordinates change.
 *
 * @param {Object} viewer - OpenSeadragon viewer instance.
 * @param {HTMLElement} element - Overlay element.
 * @param {OpenSeadragon.Rect} vpRect - Updated viewport rectangle.
 */
export function updateOverlay(viewer, element, vpRect) {
    viewer.updateOverlay(element, vpRect);
}

/**
 * Creates a generic overlay DOM element.
 *
 * Purpose:
 * Provides a reusable utility for generating styled
 * overlay elements using inline styles.
 *
 * @param {Object} [styles={}] - CSS styles applied to the element.
 * @returns {HTMLElement} Newly created overlay element.
 */
export function createOverlayElement(styles = {}) {
    const el = document.createElement("div");
    Object.assign(el.style, styles);
    return el;
}

/**
 * Creates a rectangular annotation overlay.
 *
 * Purpose:
 * Generates a rectangle overlay used for marking
 * detected or manually annotated regions in the image.
 *
 * The rectangle is converted from image coordinates
 * to OpenSeadragon viewport coordinates.
 *
 * @param {Object} viewer - OpenSeadragon viewer instance.
 * @param {number} x - Rectangle X coordinate in image space.
 * @param {number} y - Rectangle Y coordinate in image space.
 * @param {number} width - Rectangle width in image pixels.
 * @param {number} height - Rectangle height in image pixels.
 * @param {string} [color="red"] - Border color of the rectangle.
 * @param {number} [lineWidth=2] - Border thickness.
 *
 * @returns {{element: HTMLElement, vpRect: OpenSeadragon.Rect}}
 */
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
/**
 * Creates a grid line overlay.
 *
 * Purpose:
 * Generates vertical or horizontal grid lines used to
 * visually divide the image into grid segments.
 *
 * Grid lines are converted from image coordinates
 * into viewport coordinates.
 *
 * @param {Object} viewer - OpenSeadragon viewer instance.
 * @param {boolean} isVertical - Determines line orientation.
 * @param {number} position - Pixel position of the grid line.
 * @param {{x:number,y:number}} imageSize - Size of the image.
 *
 * @returns {{element: HTMLElement, vpRect: OpenSeadragon.Rect}}
 */
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


/**
 * Creates a grid cell overlay.
 *
 * Purpose:
 * Generates a filled overlay representing an active
 * or selected grid cell within the image.
 *
 * The cell position is calculated using column and row
 * indices multiplied by the configured grid size.
 *
 * @param {Object} viewer - OpenSeadragon viewer instance.
 * @param {number} col - Grid column index.
 * @param {number} row - Grid row index.
 * @param {number} gridSize - Size of each grid cell in pixels.
 * @param {number} [padding=7] - Optional padding to shrink cell borders.
 *
 * @returns {{element: HTMLElement, vpRect: OpenSeadragon.Rect, key: string}}
 */
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