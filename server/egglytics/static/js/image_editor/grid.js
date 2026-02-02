//
// 
// 
// GRID MANAGEMENT
// 
// 
// 

import { addOverlay, removeOverlay, createGridLineOverlay, createGridCellOverlay } from './overlay.js';

export class GridManager {
    constructor(viewer, gridSize = 512) {
        this.viewer = viewer;
        this.gridSize = gridSize;
        this.gridOverlays = [];
        this.filledCells = new Map();
        this.visible = false;
    }

    drawGrid() {
        this.clearGrid();

        const tiledImage = this.viewer.world.getItemAt(0);
        const imageSize = tiledImage.getContentSize();

        const cols = Math.floor(imageSize.x / this.gridSize);
        const rows = Math.floor(imageSize.y / this.gridSize);

        // Vertical grid lines
        for (let c = 1; c <= cols; c++) {
            const x = c * this.gridSize;
            const { element, vpRect } = createGridLineOverlay(
                this.viewer,
                true,
                x,
                imageSize
            );

            addOverlay(this.viewer, element, vpRect);
            this.gridOverlays.push(element);
        }

        // Horizontal grid lines
        for (let r = 1; r <= rows; r++) {
            const y = r * this.gridSize;
            const { element, vpRect } = createGridLineOverlay(
                this.viewer,
                false,
                y,
                imageSize
            );

            addOverlay(this.viewer, element, vpRect);
            this.gridOverlays.push(element);
        }

        console.log("Grid drawn");
    }

    clearGrid() {
        this.gridOverlays.forEach(el => removeOverlay(this.viewer, el));
        this.gridOverlays = [];
        this.filledCells.forEach(el => removeOverlay(this.viewer, el));
    }

    toggleCell(x, y) {
        const col = Math.floor(x / this.gridSize);
        const row = Math.floor(y / this.gridSize);
        const key = `${col},${row}`;

        if (this.filledCells.has(key)) {
            removeOverlay(this.viewer, this.filledCells.get(key));
            this.filledCells.delete(key);
            return false;
        } else {
            const { element, vpRect } = createGridCellOverlay(
                this.viewer,
                col,
                row,
                this.gridSize
            );

            addOverlay(this.viewer, element, vpRect);
            this.filledCells.set(key, element);
            return true;
        }
    }

    clearAllCells() {
        this.filledCells.forEach(el => removeOverlay(this.viewer, el));
    }

    restoreAllCells() {
        const tiledImage = this.viewer.world.getItemAt(0);

        this.filledCells.forEach((el, key) => {
            if (!el.isConnected) {
                const [col, row] = key.split(",").map(Number);

                const { element, vpRect } = createGridCellOverlay(
                    this.viewer,
                    col,
                    row,
                    this.gridSize
                );

                addOverlay(this.viewer, element, vpRect);
                this.filledCells.set(key, element);
            }
        });

        console.log("All filled cells restored");
    }

    setVisible(visible) {
        this.visible = visible;
        if (visible) {
            this.drawGrid();
            this.restoreAllCells();
        } else {
            this.clearGrid();
            this.clearAllCells();
        }
    }

    isVisible() {
        return this.visible;
    }

    
}