//
// 
// 
// POINT ANNOTATIONS MANAGEMENT
// 
// 
// 

import { imageToViewportCoordinates, viewportToPixelCoordinates } from './viewer.js';

export class PointAnnotationManager {
    constructor(viewer, canvas) {
        this.viewer = viewer;
        this.canvas = canvas;
        this.points = [];
        this.selectedPoint = null;
        this.visible = true;
    }

    addPoint(x, y) {
        this.points.push({ x: Number(x), y: Number(y) });
    }

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

    loadPoints(loadedPoints) {
        this.points.length = 0;
        loadedPoints.forEach(p => {
            this.points.push({
                x: Number(p.x),
                y: Number(p.y)
            });
        });
    }

    clearPoints() {
        this.points.length = 0;
    }

    setVisible(visible) {
        this.visible = visible;
        this.redraw();
    }

    setSelectedPoint(point) {
        this.selectedPoint = point;
    }

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

    clear() {
        const ctx = this.canvas.getContext("2d");
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.selectedPoint = null;
    }

    getPoints() {
        return this.points;
    }

    getPointsReversed() {
        return [...this.points].reverse();
    }
}