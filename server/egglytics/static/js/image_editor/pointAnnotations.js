//
// 
// 
// POINT ANNOTATIONS MANAGEMENT
// 
// 
// 

import { imageToViewportCoordinates, viewportToPixelCoordinates } from './viewer.js';
/**
 * PointAnnotationManager
 * ----------------------
 * Manages point-based annotations on top of an OpenSeadragon viewer.
 *
 * Responsibilities:
 * - Store annotation points in image coordinates
 * - Render annotation points onto a canvas overlay
 * - Support point selection and hover highlighting
 * - Convert coordinates between image, viewport, and pixel space
 * - Enable adding, removing, loading, and clearing annotations
 *
 * Points are stored in image coordinate space and converted
 * dynamically to pixel coordinates during rendering. This ensures
 * that annotations remain correctly positioned when the viewer
 * zooms or pans.
 *
 * Rendering Workflow:
 * Image Coordinates → Viewport Coordinates → Pixel Coordinates → Canvas Drawing
 *
 * Visual States:
 * - Default: Lime colored points
 * - Hover: Yellow colored points
 * - Selected: Red colored points
 *
 * Dependencies:
 * - viewer.js (coordinate conversion utilities)
 * - OpenSeadragon viewer instance
 * - Canvas overlay element
 */
export class PointAnnotationManager {
    /**
     * Creates a new PointAnnotationManager instance.
     *
     * @param {Object} viewer - OpenSeadragon viewer instance.
     * @param {HTMLCanvasElement} canvas - Canvas overlay used for rendering points.
     */
    constructor(viewer, canvas) {
        this.viewer = viewer;
        this.canvas = canvas;
        this.points = [];
        this.selectedPoint = null;
        this.visible = true;
    }


    /**
     * Adds a new annotation point.
     *
     * Purpose:
     * Stores a point in image coordinate space.
     *
     * @param {number} x - X coordinate in image space.
     * @param {number} y - Y coordinate in image space.
     */
    addPoint(x, y) {
        this.points.push({ x: Number(x), y: Number(y) });
    }

    /**
     * Removes a point near the specified coordinates.
     *
     * Purpose:
     * Searches for a point within a tolerance radius and removes it.
     * This is typically used when the user clicks near an existing point.
     *
     * @param {number} x - X coordinate in image space.
     * @param {number} y - Y coordinate in image space.
     * @param {number} [tolerance=10] - Maximum distance allowed for removal.
     *
     * @returns {Object|null} The removed point if found, otherwise null.
     */
    removePointAt(x, y, tolerance = 10) {
        for (let i = this.points.length - 1; i >= 0; i--) {
            const p = this.points[i];
            const dx = p.x - x;
            const dy = p.y - y;

            if (Math.hypot(dx, dy) <= tolerance) {
                const removed = this.points.splice(i, 1)[0];
                return removed;
            }
        }
        return null;
    }

    /**
     * Loads a set of points into the manager.
     *
     * Purpose:
     * Used when loading annotations from the server or stored data.
     *
     * @param {Array<Object>} loadedPoints - Array of point objects with x and y values.
     */
    loadPoints(loadedPoints) {
        this.points.length = 0;
        loadedPoints.forEach(p => {
            this.points.push({
                x: Number(p.x),
                y: Number(p.y)
            });
        });
    }

    /**
     * Clears all stored annotation points.
     */
    clearPoints() {
        this.points.length = 0;
    }

    /**
     * Sets whether the point annotations are visible.
     *
     * Purpose:
     * Enables toggling visibility of annotations without deleting them.
     *
     * @param {boolean} visible - Visibility state.
     */
    setVisible(visible) {
        this.visible = visible;
        this.redraw();
    }

    /**
     * Sets the currently selected annotation point.
     *
     * Purpose:
     * Highlights the selected point during rendering.
     *
     * @param {Object|null} point - Point object to mark as selected.
     */
    setSelectedPoint(point) {
        this.selectedPoint = point;
    }

    /**
     * Redraws all annotation points on the canvas overlay.
     *
     * Purpose:
     * Converts image coordinates into viewport coordinates
     * and finally into pixel coordinates for rendering.
     *
     * Rendering logic:
     * - Selected point → red
     * - Hovered point → yellow
     * - Normal point → lime
     */
    redraw() {
        if (!this.visible) {
            this.clear();
            return;
        }

        const ctx = this.canvas.getContext("2d");
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const tiledImage = this.viewer.world.getItemAt(0);

        for (const p of this.points) {
            const vp = imageToViewportCoordinates(this.viewer, p.x, p.y);
            const pixel = viewportToPixelCoordinates(this.viewer, vp, true);

            const size = 10;
            const halfSize = size / 2;

            let color = "lime";
            if (p === this.selectedPoint) color = "red";
            else if (p.hover) color = "yellow";

            ctx.fillStyle = color;
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.arc(pixel.x, pixel.y, halfSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }

    /**
     * Clears the canvas overlay.
     *
     * Purpose:
     * Removes all drawn points without deleting stored data.
     */
    clear() {
        const ctx = this.canvas.getContext("2d");
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.selectedPoint = null;
    }

    /**
     * Returns the list of stored points.
     *
     * @returns {Array<Object>} Array of point objects.
     */
    getPoints() {
        return this.points;
    }

    /**
     * Returns the list of points in reverse order.
     *
     * Purpose:
     * Useful for UI displays where newest annotations should appear first.
     *
     * @returns {Array<Object>} Reversed copy of the points array.
     */
    getPointsReversed() {
        return [...this.points].reverse();
    }
}