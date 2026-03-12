//
// 
// 
// GRID MANAGEMENT
// 
// 
// 


import { saveGridToServer } from './api.js';
import { addOverlay, addOverlayWithMinimap, removeOverlay, createGridLineOverlay, createGridCellOverlay } from './overlay.js';

/**
 * GridManager
 * -----------
 * Handles grid visualization and interaction for the image viewer.
 *
 * Responsibilities:
 * - Draw grid lines on top of the viewer image
 * - Manage filled grid cells used for annotation or selection
 * - Toggle grid cells based on user interaction
 * - Synchronize grid state with the backend server
 * - Restore grid state when switching views or reloading overlays
 *
 * The grid system divides the image into fixed-size cells and
 * allows users to activate or deactivate cells as part of the
 * annotation workflow.
 *
 * External Dependencies:
 * - api.js (server communication for saving grid states)
 * - overlay.js (overlay creation and management utilities)
 *
 * Workflow:
 * Viewer Loaded → Grid Drawn → User Toggles Cells → Server Sync
 */

export class GridManager {
    /**
     * Creates a GridManager instance.
     *
     * @param {Object} viewer - OpenSeadragon viewer instance.
     * @param {number} [gridSize=512] - Size of each grid cell in pixels.
     * @param {number|string} img_id - Identifier of the image associated with the grid.
     */
    constructor(viewer, gridSize = 512,img_id) {
        this.viewer = viewer;
        this.gridSize = gridSize;
        this.gridOverlays = [];
        this.filledCells = new Map();
        this.visible = false;
        this.img_id = img_id;
    }
    /**
     * Loads previously saved grid cell states.
     *
     * Purpose:
     * Restores filled grid cells from data retrieved from the server
     * when an image is opened or annotations are loaded.
     *
     * @param {Array<Object>} gridArray - Array of saved grid coordinates.
     */
    loadGrid(gridArray) {
        
        if (!Array.isArray(gridArray)) return;

        // Clear existing (prevents duplicates when switching images)

        gridArray.forEach(g => {
            const col = parseInt(g.x);
            const row = parseInt(g.y);
            const key = `${col},${row}`;


            const { element, vpRect } = createGridCellOverlay(
                this.viewer,
                col,
                row,
                this.gridSize
            );
            this.filledCells.set(key, element);
        });


    }

    /**
     * Draws grid lines over the current image.
     *
     * Purpose:
     * Generates vertical and horizontal grid overlays based on the
     * configured grid size and the image dimensions.
     *
     * This method clears any previously drawn grid before rendering.
     */
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

    /**
     * Removes all grid overlays from the viewer.
     *
     * Purpose:
     * Clears both grid lines and filled cell overlays from the viewer
     * to prevent duplicate overlays or visual artifacts.
     */
    clearGrid() {
        this.gridOverlays.forEach(el => removeOverlay(this.viewer, el));
        this.gridOverlays = [];
        this.filledCells.forEach(el => removeOverlay(this.viewer, el));
    }

    /**
     * Toggles the state of a grid cell.
     *
     * Purpose:
     * Determines the grid cell corresponding to the clicked image
     * coordinates and toggles its active state.
     *
     * If the cell is already active, it will be removed.
     * If inactive, a filled overlay will be created.
     *
     * The change is also sent to the backend server so that the
     * grid state can be persisted.
     *
     * @param {number} x - Image X coordinate of the click.
     * @param {number} y - Image Y coordinate of the click.
     * @returns {boolean} True if the cell was added, false if removed.
     */
    toggleCell(x, y) {
        const col = Math.floor(x / this.gridSize);
        const row = Math.floor(y / this.gridSize);
        const key = `${col},${row}`;

        // This is already boolean so it checks if it exists or not in the server.
        saveGridToServer(this.img_id,col,row);

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

            addOverlayWithMinimap(this.viewer, element, vpRect); // Changed this line
            this.filledCells.set(key, element);
            return true;
        }
    }

    /**
     * Removes all filled grid cell overlays.
     *
     * Purpose:
     * Clears active grid cell markers while leaving the grid lines intact.
     */
    clearAllCells() {
        this.filledCells.forEach(el => removeOverlay(this.viewer, el));
    }

    /**
     * Restores all previously active grid cells.
     *
     * Purpose:
     * Recreates overlays for stored filled cells when the grid
     * becomes visible again or when overlays are reinitialized.
     *
     * This prevents losing visual markers during viewer refreshes.
     */
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

                addOverlayWithMinimap(this.viewer, element, vpRect); // Changed this line
                this.filledCells.set(key, element);
            }
        });

        console.log("All filled cells restored");
    }

    /**
     * Sets the visibility state of the grid.
     *
     * Purpose:
     * Controls whether the grid and filled cells are displayed
     * on the viewer.
     *
     * When enabled:
     * - Grid lines are drawn
     * - Filled cells are restored
     *
     * When disabled:
     * - All grid overlays are removed
     *
     * @param {boolean} visible - Desired visibility state.
     */
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
    
    /**
     * Returns the current visibility state of the grid.
     *
     * @returns {boolean} True if the grid is visible.
     */
    isVisible() {
        return this.visible;
    }

    
}