/**
 * -----------------------------------------
 * POINT ANNOTATION MANAGER
 * -----------------------------------------
 * Handles creation, rendering, selection,
 * and storage of point annotations.
 */

import { addOverlay, removeOverlay, updateOverlay, createOverlayElement } from './overlay.js';

export class RectAnnotationManager {
    /**
     * Creates a new RectAnnotationManager instance.
     * @param {OpenSeadragon.Viewer} viewer - The OpenSeadragon viewer instance.
     */
    constructor(viewer) {
        this.viewer = viewer;
        /** @type {Array<Object>} List of rectangle annotations */
        this.rects = [];
        /** @type {Array<Array<number>>} Temporary edge points for rectangle drawing */
        this.edges = [];
        /** @type {HTMLElement|null} Preview rectangle overlay */
        this.previewRect = null;
    }

    /**
     * Adds an edge point for rectangle drawing.
     * @param {number} x - X coordinate in image space
     * @param {number} y - Y coordinate in image space
     * @returns {number} Number of edges currently stored
     */
    addEdge(x, y) {
        this.edges.push([x, y]);
        return this.edges.length;
    }

    /**
     * Clears stored edge points.
     */
    clearEdges() {
        this.edges = [];
    }

    /**
     * Returns stored edge points.
     * @returns {Array<Array<number>>}
     */
    getEdges() {
        return this.edges;
    }

    /**
     * Updates or creates a preview rectangle during drawing.
     *
     * @param {number} x1 - Starting X coordinate (image space)
     * @param {number} y1 - Starting Y coordinate (image space)
     * @param {number} x2 - Ending X coordinate (image space)
     * @param {number} y2 - Ending Y coordinate (image space)
     */
    updatePreview(x1, y1, x2, y2) {
        const tiledImage = this.viewer.world.getItemAt(0);

        const minX = Math.min(x1, x2);
        const minY = Math.min(y1, y2);
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);

        const vpTL = tiledImage.imageToViewportCoordinates(minX, minY);
        const vpBR = tiledImage.imageToViewportCoordinates(minX + width, minY + height);

        const vpRect = new OpenSeadragon.Rect(
            vpTL.x,
            vpTL.y,
            vpBR.x - vpTL.x,
            vpBR.y - vpTL.y
        );

        if (!this.previewRect) {
            this.previewRect = createOverlayElement({
                border: "2px dashed #ff6b6b",
                background: "rgba(255,107,107,0.15)",
                pointerEvents: "none",
                boxSizing: "border-box"
            });

            addOverlay(this.viewer, this.previewRect, vpRect);
        } else {
            updateOverlay(this.viewer, this.previewRect, vpRect);
        }
    }

    /**
     * Hides and removes the preview rectangle.
    */
    hidePreview() {
        if (this.previewRect) {
            removeOverlay(this.viewer, this.previewRect);
            this.previewRect = null;
        }
    }

    /**
     * Adds a rectangle annotation to the viewer.
     *
     * @param {number} x1 - Starting X coordinate (image space)
     * @param {number} y1 - Starting Y coordinate (image space)
     * @param {number} x2 - Ending X coordinate (image space)
     * @param {number} y2 - Ending Y coordinate (image space)
     * @param {string} [color="red"] - Border color
     * @param {number} [lineWidth=2] - Border width
     * @param {string|null} [rectId=null] - Optional rectangle identifier
     * @returns {Object} Created rectangle annotation object
    */
    addRect(x1, y1, x2, y2, color = "red", lineWidth = 2, rectId = null) {
        const minX = Math.min(x1, x2);
        const minY = Math.min(y1, y2);
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);

        const tiledImage = this.viewer.world.getItemAt(0);
        const vpTL = tiledImage.imageToViewportCoordinates(minX, minY);
        const vpBR = tiledImage.imageToViewportCoordinates(minX + width, minY + height);

        const rectEl = createOverlayElement({
            border: `${lineWidth}px solid ${color}`,
            pointerEvents: "none",
            boxSizing: "border-box"
        });

        const overlayId = rectId ? `rect-${rectId}` : `rect-${this.rects.length}-${Date.now()}`;

        addOverlay(this.viewer, rectEl, new OpenSeadragon.Rect(
            vpTL.x,
            vpTL.y,
            vpBR.x - vpTL.x,
            vpBR.y - vpTL.y
        ), overlayId);

        const rect = {
            id: rectId,
            x: minX,
            y: minY,
            width,
            height,
            element: rectEl,
            overlayId
        };

        this.rects.push(rect);
        return rect;
    }

    /**
     * Loads rectangles from stored data.
     *
     * @param {Array<Object>} loadedRects List of rectangles containing
     * {x_init, y_init, x_end, y_end, rect_id}
     */
    loadRects(loadedRects) {
        this.rects.length = 0;

        loadedRects.forEach(r => {
            this.addRect(r.x_init, r.y_init, r.x_end, r.y_end, "red", 2, r.rect_id);
        });
    }

    /**
     * Removes a rectangle annotation.
     *
     * @param {Object} rect Rectangle object to remove
     */
    removeRect(rect) {
        if (rect.element) {
            removeOverlay(this.viewer, rect.element);
        }
        const index = this.rects.indexOf(rect);
        if (index > -1) {
            this.rects.splice(index, 1);
        }
    }

    /**
     * Finds the top-most rectangle containing a given point.
     *
     * @param {number} x X coordinate in image space
     * @param {number} y Y coordinate in image space
     * @returns {Object|null} Rectangle object or null
     */
    findRectAtPoint(x, y) {
        for (let i = this.rects.length - 1; i >= 0; i--) {
            const r = this.rects[i];
            if (this.isPointInsideRect(x, y, r)) {
                return r;
            }
        }
        return null;
    }

    /**
     * Checks whether a point lies inside a rectangle.
     *
     * @param {number} px Point X coordinate
     * @param {number} py Point Y coordinate
     * @param {Object} rect Rectangle object
     * @returns {boolean}
     */
    isPointInsideRect(px, py, rect) {
        return (
            px >= rect.x &&
            px <= rect.x + rect.width &&
            py >= rect.y &&
            py <= rect.y + rect.height
        );
    }

    /**
     * Restores hidden rectangles to the viewer.
     *
     * @param {string} [color="red"] Border color
     * @param {number} [lineWidth=2] Border width
     */
    hideAll() {
        this.rects.forEach(r => {
            if (r.element) {
                removeOverlay(this.viewer, r.element);
                r.element = null;
            }
        });
    }

    /**
     * Restores hidden rectangles to the viewer.
     *
     * @param {string} [color="red"] Border color
     * @param {number} [lineWidth=2] Border width
     */
    restoreAll(color = "red", lineWidth = 2) {
        const tiledImage = this.viewer.world.getItemAt(0);

        this.rects.forEach(r => {
            if (r.element) return; // already visible

            const vpTL = tiledImage.imageToViewportCoordinates(r.x, r.y);
            const vpBR = tiledImage.imageToViewportCoordinates(
                r.x + r.width,
                r.y + r.height
            );

            const rectEl = createOverlayElement({
                border: `${lineWidth}px solid ${color}`,
                pointerEvents: "none",
                boxSizing: "border-box"
            });

            addOverlay(this.viewer, rectEl, new OpenSeadragon.Rect(
                vpTL.x,
                vpTL.y,
                vpBR.x - vpTL.x,
                vpBR.y - vpTL.y
            ));

            r.element = rectEl;
        });
    }


    /**
     * Returns the stored rectangles.
     * @returns {Array<Object>}
     */    
    getRects() {
        return this.rects;
    }
    
    /**
     * Returns rectangles in reverse order.
     * Useful when rendering top-most annotations first.
     *
     * @returns {Array<Object>}
     */
    getRectsReversed() {
        return [...this.rects].reverse();
    }
}