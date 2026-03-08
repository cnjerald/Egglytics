//
// 
// 
// RECTANGLE ANNOTATIONS MANAGEMENT
// 
// 
// 

import { addOverlay, removeOverlay, updateOverlay, createOverlayElement } from './overlay.js';

export class RectAnnotationManager {
    constructor(viewer) {
        this.viewer = viewer;
        this.rects = [];
        this.edges = [];
        this.previewRect = null;
    }

    addEdge(x, y) {
        this.edges.push([x, y]);
        return this.edges.length;
    }

    clearEdges() {
        this.edges = [];
    }

    getEdges() {
        return this.edges;
    }

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

    hidePreview() {
        if (this.previewRect) {
            removeOverlay(this.viewer, this.previewRect);
            this.previewRect = null;
        }
    }

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

    loadRects(loadedRects) {
        this.rects.length = 0;

        loadedRects.forEach(r => {
            this.addRect(r.x_init, r.y_init, r.x_end, r.y_end, "red", 2, r.rect_id);
        });
    }

    removeRect(rect) {
        if (rect.element) {
            removeOverlay(this.viewer, rect.element);
        }
        const index = this.rects.indexOf(rect);
        if (index > -1) {
            this.rects.splice(index, 1);
        }
    }

    findRectAtPoint(x, y) {
        for (let i = this.rects.length - 1; i >= 0; i--) {
            const r = this.rects[i];
            if (this.isPointInsideRect(x, y, r)) {
                return r;
            }
        }
        return null;
    }

    isPointInsideRect(px, py, rect) {
        return (
            px >= rect.x &&
            px <= rect.x + rect.width &&
            py >= rect.y &&
            py <= rect.y + rect.height
        );
    }

    hideAll() {
        this.rects.forEach(r => {
            if (r.element) {
                removeOverlay(this.viewer, r.element);
                r.element = null;
            }
        });
    }

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

    getRects() {
        return this.rects;
    }

    getRectsReversed() {
        return [...this.rects].reverse();
    }
}