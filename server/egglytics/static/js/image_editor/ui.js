// ui.js - UI management and rendering

import { panToImageCoordinates } from './viewer.js';

export class UIManager {
    constructor(listEl, modeEl, eggCountEl) {
        this.listEl = listEl;
        this.modeEl = modeEl;
        this.eggCountEl = eggCountEl;
        this.renderedCount = 0;
        this.pageSize = 50;
    }

    setMode(mode) {
        this.modeEl.textContent = mode;

        if (mode === "Point") {
            this.modeEl.style.color = "#6cff6c";
        } else if (mode === "Rectangle") {
            this.modeEl.style.color = "#ff6b6b";
        } else {
            this.modeEl.style.color = "#ccc";
        }
    }

    setEggCount(count) {
        this.eggCountEl.innerHTML = "Egg Count: " + count;
    }

    clearList() {
        this.listEl.innerHTML = "";
        this.renderedCount = 0;
    }

    renderPointsList(viewer, pointManager, reset = false) {
        if (reset) {
            this.clearList();
        }

        const points = pointManager.getPoints();
        const reversed = [...points].reverse();
        const slice = reversed.slice(this.renderedCount, this.renderedCount + this.pageSize);

        slice.forEach(p => {
            const li = document.createElement("li");
            li.textContent = `(X=${p.x}, Y=${p.y})`;
            li.style.cursor = "pointer";

            li.onclick = () => {
                panToImageCoordinates(viewer, p.x, p.y);
                pointManager.setSelectedPoint(p);
                pointManager.redraw();
            };

            li.onmouseenter = () => {
                p.hover = true;
                pointManager.redraw();
            };

            li.onmouseleave = () => {
                p.hover = false;
                pointManager.redraw();
            };

            this.listEl.appendChild(li);
        });

        this.renderedCount += slice.length;
    }

    renderRectList(viewer, rectManager) {
        this.clearList();

        const rects = rectManager.getRectsReversed();

        rects.forEach(r => {
            const li = document.createElement("li");
            li.textContent = `Rect: X=${r.x}, Y=${r.y}, W=${r.width}, H=${r.height}`;
            li.style.cursor = "pointer";

            li.onclick = () => {
                const cx = r.x + r.width / 2;
                const cy = r.y + r.height / 2;

                panToImageCoordinates(viewer, cx, cy);

                viewer.viewport.zoomTo(
                    Math.min(
                        viewer.viewport.getMaxZoom(),
                        viewer.viewport.getZoom() * 1.3
                    )
                );
            };

            li.onmouseenter = () => {
                if (r.element) r.element.style.borderColor = "lime";
            };

            li.onmouseleave = () => {
                if (r.element) r.element.style.borderColor = "red";
            };

            li.ondblclick = () => {
                rectManager.removeRect(r);
                this.renderRectList(viewer, rectManager);
            };

            this.listEl.appendChild(li);
        });
    }

    setupScrollPagination(pointManager) {
        this.listEl.addEventListener("scroll", () => {
            const nearBottom =
                this.listEl.scrollTop + this.listEl.clientHeight >=
                this.listEl.scrollHeight - 10;

            if (nearBottom && this.renderedCount < pointManager.getPoints().length) {
                this.renderPointsList(null, pointManager, false);
            }
        });
    }
}