import {
    imageToViewportCoordinates,
    viewportToPixelCoordinates
} from "./viewer.js";

/**
 * PolygonManager
 * --------------
 * Manages polygon-based annotations drawn on top of an OpenSeadragon viewer.
 *
 * Responsibilities:
 * - Create polygon annotations by sequentially placing vertices
 * - Detect polygon closure based on screen-space distance
 * - Render completed and in-progress polygons on a canvas overlay
 * - Provide preview "rubber-band" lines while drawing
 * - Support loading, removing, and highlighting polygons
 * - Compute polygon areas for analytical purposes
 *
 * Coordinate Workflow:
 * Image Coordinates → Viewport Coordinates → Pixel Coordinates → Canvas Rendering
 *
 * Data Structures:
 * - polygons: Array of completed polygons
 * - currentPolygon: Array of vertices being drawn
 * - previewPoint: Temporary cursor position used for rubber-band preview
 *
 * Visual States:
 * - Completed polygon: Green outline with semi-transparent fill
 * - Polygon being drawn: Yellow outline
 * - Rubber-band preview: Orange dashed line
 *
 * Dependencies:
 * - viewer.js coordinate conversion utilities
 * - OpenSeadragon viewer instance
 * - Canvas overlay for rendering
 */

export class PolygonManager {

    /**
     * Creates a new PolygonManager instance.
     *
     * @param {Object} viewer - OpenSeadragon viewer instance.
     * @param {HTMLCanvasElement} canvas - Canvas overlay used for polygon rendering.
     */

    constructor(viewer, canvas) {
        this.viewer = viewer;
        this.canvas = canvas;

        this.polygons = [];        // Array of completed polygons
        this.currentPolygon = [];  // Points being drawn
        this.visible = true;
        this.previewPoint = null; // {x, y} in image coords

        this.closeThreshold = 10;  // pixels (screen-space)
    }

    /* ----------------------------
       POINT / POLYGON CREATION
    ----------------------------- */

    /**
     * Adds a vertex to the currently drawn polygon.
     *
     * @param {number} x - X coordinate in image space.
     * @param {number} y - Y coordinate in image space.
     */
    addPoint(x, y) {
        this.currentPolygon.push({
            x: Number(x),
            y: Number(y)
        });
    }
    /**
     * Attempts to close the polygon when the cursor is near the first vertex.
     *
     * Purpose:
     * Detects if the user clicked close enough to the starting vertex
     * to finalize the polygon.
     *
     * @param {number} x - Cursor X coordinate in image space.
     * @param {number} y - Cursor Y coordinate in image space.
     * @returns {boolean} True if the polygon was closed.
     */
    tryClosePolygon(x, y) {
        if (this.currentPolygon.length < 3) return false;

        const first = this.currentPolygon[0];

        const vp1 = imageToViewportCoordinates(this.viewer, first.x, first.y);
        const vp2 = imageToViewportCoordinates(this.viewer, x, y);

        const p1 = viewportToPixelCoordinates(this.viewer, vp1, true);
        const p2 = viewportToPixelCoordinates(this.viewer, vp2, true);

        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);

        if (dist <= this.closeThreshold) {
            this.finishPolygon();
            return true;
        }

        return false;
    }

    /**
     * Updates the preview point used for the rubber-band drawing effect.
     *
     * @param {number} x - Cursor X coordinate in image space.
     * @param {number} y - Cursor Y coordinate in image space.
     */
    updatePreview(x, y) {
        this.previewPoint = { x, y };
        this.redraw();
    }

    /**
     * Finalizes the current polygon.
     *
     * Behavior:
     * - Closes the polygon by repeating the first vertex
     * - Stores the polygon in the completed polygon list
     * - Clears the current polygon state
     */
    finishPolygon() {
        if (this.currentPolygon.length < 3) return;

        // Explicitly close contour
        this.currentPolygon.push({ ...this.currentPolygon[0] });

        this.polygons.push([...this.currentPolygon]);
        this.currentPolygon.length = 0;
        this.previewPoint = null; // Clear preview point
        this.redraw();
    }

    /**
     * Cancels the polygon currently being drawn.
     */
    cancelCurrentPolygon() {
        this.currentPolygon.length = 0;
        this.previewPoint = null; // Clear preview point
        this.redraw();
    }

    /**
     * Redraws all polygons and preview elements.
     *
     * Rendering Layers:
     * 1. Completed polygons
     * 2. In-progress polygon
     * 3. Vertex markers
     * 4. Rubber-band preview line
     */
        redraw() {
        // Always clear the canvas first
        this.clear();

        if (!this.visible) {
            return;
        }

        const ctx = this.canvas.getContext("2d");


        // --------------------------
        // Draw completed polygons
        // --------------------------
        for (const polygon of this.polygons) {
            this.drawPolygonCached(ctx, polygon, "rgba(0,255,0,0.25)", "lime");
        }

        // --------------------------
        // Draw current polygon (in-progress)
        // --------------------------
        if (this.currentPolygon.length > 0) {
            this.drawPolygonCached(ctx, this.currentPolygon, "rgba(255,255,0,0.15)", "yellow", true);

            // Draw vertices for current polygon while drawing
            for (const p of this.currentPolygon) {
                const pixel = this.toPixel(p.x, p.y);
                ctx.fillStyle = "yellow";
                ctx.beginPath();
                ctx.arc(pixel.x, pixel.y, 4, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw rubber-band preview line to current mouse position
            if (this.previewPoint) {
                const last = this.currentPolygon[this.currentPolygon.length - 1];

                const lastPixel = this.toPixel(last.x, last.y);
                const previewPixel = this.toPixel(this.previewPoint.x, this.previewPoint.y);

                ctx.strokeStyle = "orange";
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);

                ctx.beginPath();
                ctx.moveTo(lastPixel.x, lastPixel.y);
                ctx.lineTo(previewPixel.x, previewPixel.y);
                ctx.stroke();

                ctx.setLineDash([]);
            }
        }
    }

    /**
     * Converts image coordinates to pixel coordinates for canvas drawing.
     *
     * @param {number} x - Image X coordinate.
     * @param {number} y - Image Y coordinate.
     * @returns {{x:number,y:number}} Pixel coordinates.
     */

    toPixel(x, y) {
        const vp = imageToViewportCoordinates(this.viewer, x, y);
        return viewportToPixelCoordinates(this.viewer, vp, true);
    }

    /**
     * Draws a polygon on the canvas using cached coordinate conversions.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context.
     * @param {Array} points - Polygon vertices.
     * @param {string} fill - Fill color.
     * @param {string} stroke - Stroke color.
     * @param {boolean} [isPreview=false] - Whether the polygon is a preview.
     */
    drawPolygonCached(ctx, points, fill, stroke, isPreview = false) {
        if (points.length < 2) return;

        ctx.beginPath();
        const firstPixel = this.toPixel(points[0].x, points[0].y);
        ctx.moveTo(firstPixel.x, firstPixel.y);

        for (let i = 1; i < points.length; i++) {
            const pPixel = this.toPixel(points[i].x, points[i].y);
            ctx.lineTo(pPixel.x, pPixel.y);
        }

        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.stroke();

        if (!isPreview) {
            ctx.fillStyle = fill;
            ctx.fill();
        }

        // Draw vertices only for non-preview
        if (!isPreview) {
            for (const p of points) {
                const pixel = this.toPixel(p.x, p.y);
                ctx.fillStyle = stroke;
                ctx.beginPath();
                ctx.arc(pixel.x, pixel.y, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    /**
     * Sets the visibility of polygon annotations.
     *
     * @param {boolean} visible - Visibility state.
     */

    setVisible(visible) {
        this.visible = visible;
        this.redraw();
    }

    /**
     * Clears the canvas overlay.
     */
    clear() {
        const ctx = this.canvas.getContext("2d");
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Returns all stored polygons.
     *
     * @returns {Array} Array of polygon vertex arrays.
     */
    getPolygons() {
        return this.polygons;
    }

    /**
     * Calculates the area of a polygon using the Shoelace Formula.
     *
     * @param {Array} points - Polygon vertices.
     * @returns {number} Polygon area in image coordinate units.
     */    
    _polygonArea(points) {
        let n = points.length;
        let sum = 0;
        for (let i = 0; i < n; i++) {
            let j = (i + 1) % n; // wrap around
            sum += points[i].x * points[j].y;
            sum -= points[j].x * points[i].y;
        }
        return Math.abs(sum / 2);
    }

    /**
     * Computes the average area of all stored polygons.
     *
     * @returns {number} Average polygon area.
     */
    getAverageAreaOfPolygons() {
        let totalArea = 0;
        for (const poly of this.polygons) {
            totalArea += this._polygonArea(poly);
        }
        return totalArea/this.polygons.length;
    }

    /**
     * Loads polygon annotations from external data.
     *
     * @param {Array} polygons - Array of polygon vertex arrays.
     */
    loadPolygons(polygons) {
        this.polygons.length = 0;
        polygons.forEach(p => {
            this.polygons.push(p.map(pt => ({
                x: Number(pt.x),
                y: Number(pt.y)
            })));
        });
        this.redraw();
    }

    /**
     * Updates the preview line while drawing a polygon.
     *
     * @param {number} x - Cursor X coordinate in image space.
     * @param {number} y - Cursor Y coordinate in image space.
     */
    drawPreviewTo(x, y) {
        if (this.currentPolygon.length === 0) return;

        // Simply update the preview point and redraw
        // This avoids double-drawing
        this.updatePreview(x, y);
    }

    /**
     * Removes the last vertex from the current polygon.
     */
    removeLastPoint() {
        if (this.currentPolygon.length > 0) {
            this.currentPolygon.pop();
            this.redraw();
        }
    }

    /**
     * Removes the most recently completed polygon.
    */
    removeLastPolygon() {
        if (this.polygons.length > 0) {
            this.polygons.pop();
            this.redraw();
        }
    }

    /**
     * Highlights a polygon for visual emphasis.
     *
     * @param {Array} poly - Polygon to highlight.
     */
    highlightPolygon(poly) {
        this.highlighted = poly;
        this.redraw();
    }


    /**
     * Clears the currently highlighted polygon.
     */
    clearHighlight() {
        this.highlighted = null;
        this.redraw();
    }
    
    /**
     * Removes a specific polygon from the manager.
     *
     * @param {Array} poly - Polygon to remove.
     */
    removePolygon(poly) {
        this.polygons = this.polygons.filter(p => p !== poly);
        this.redraw();
    }

}