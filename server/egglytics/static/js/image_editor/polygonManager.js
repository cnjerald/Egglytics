import {
    imageToViewportCoordinates,
    viewportToPixelCoordinates
} from "./viewer.js";

export class PolygonManager {
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

    addPoint(x, y) {
        this.currentPolygon.push({
            x: Number(x),
            y: Number(y)
        });
    }

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

    updatePreview(x, y) {
        this.previewPoint = { x, y };
        this.redraw();
    }

    finishPolygon() {
        if (this.currentPolygon.length < 3) return;

        // Explicitly close contour
        this.currentPolygon.push({ ...this.currentPolygon[0] });

        this.polygons.push([...this.currentPolygon]);
        this.currentPolygon.length = 0;
        this.previewPoint = null; // Clear preview point
        this.redraw();
    }

    cancelCurrentPolygon() {
        this.currentPolygon.length = 0;
        this.previewPoint = null; // Clear preview point
        this.redraw();
    }

    /* ----------------------------
       DRAWING
    ----------------------------- */
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

    /* ----------------------------
    Convert image coords -> pixel coords
    ----------------------------- */
    toPixel(x, y) {
        const vp = imageToViewportCoordinates(this.viewer, x, y);
        return viewportToPixelCoordinates(this.viewer, vp, true);
    }

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

    /* ----------------------------
       VISIBILITY / UTILS
    ----------------------------- */

    setVisible(visible) {
        this.visible = visible;
        this.redraw();
    }

    clear() {
        const ctx = this.canvas.getContext("2d");
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    getPolygons() {
        return this.polygons;
    }
    
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

    getAverageAreaOfPolygons() {
        let totalArea = 0;
        for (const poly of this.polygons) {
            totalArea += this._polygonArea(poly);
        }
        return totalArea/this.polygons.length;
    }

    

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

    drawPreviewTo(x, y) {
        if (this.currentPolygon.length === 0) return;

        // Simply update the preview point and redraw
        // This avoids double-drawing
        this.updatePreview(x, y);
    }
}