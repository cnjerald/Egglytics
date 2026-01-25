import { initializeViewer, setupCanvas, setupCanvasResize, setupMouseTracker, getMouseImagePosition } from './image_editor/viewer.js';
import { PointAnnotationManager } from './image_editor/pointAnnotations.js';
import { RectAnnotationManager } from './image_editor/rectAnnotations.js';
import { GridManager } from './image_editor/grid.js';
import { UIManager } from './image_editor/ui.js';
import { addPointToServer, removePointFromServer, addRectToServer, removeRectFromServer } from './image_editor/api.js';

$(document).ready(function () {
    // Configuration
    const ADD_ANNOTATION_KEY = "e";
    const DELETE_ANNOTATION_KEY = "r";
    const GRID_TOGGLE_KEY = "";
    const FILL_CELL_KEY = "w";

    // State
    let isPointAnnotate = true;
    let isRectAnnotate = false;
    let viewerReady = false;
    let lastMousePos = null;
    let totalEggs = window.total_egg_count;

    // Get elements
    const annotationListEl = document.getElementById("annotation-list");
    const modeEl = document.getElementById("current-mode");
    const eggCountEl = document.getElementById("egg_count");
    const imageUrl = document.getElementById("viewer").dataset.imageUrl;
    const imageId = window.image_id;

    // Initialize managers
    const viewer = initializeViewer(imageUrl);
    const canvas = setupCanvas(viewer);
    const pointManager = new PointAnnotationManager(viewer, canvas);
    const rectManager = new RectAnnotationManager(viewer);
    const gridManager = new GridManager(viewer, 512);
    const uiManager = new UIManager(annotationListEl, modeEl, eggCountEl);

    // Set initial egg count
    uiManager.setEggCount(totalEggs);

    // Setup canvas resize and redraw
    setupCanvasResize(viewer, canvas, () => pointManager.redraw());

    // Setup mouse tracker
    setupMouseTracker(viewer, function (event) {
        lastMousePos = event.position;

        if (!isRectAnnotate || rectManager.getEdges().length !== 1) return;

        const pos = getMouseImagePosition(viewer, event.position);
        const edges = rectManager.getEdges();
        rectManager.updatePreview(edges[0][0], edges[0][1], pos.x, pos.y);
    });

    // Viewer open handler
    viewer.addHandler("open", function () {
        console.log("Viewer opened and ready!");
        viewerReady = true;

        if (Array.isArray(window.points)) {
            pointManager.loadPoints(window.points);
        }
        if (Array.isArray(window.rects)) {
            rectManager.loadRects(window.rects);
        }

        console.log("Image size:", viewer.world.getItemAt(0).getContentSize());
        console.log("Sample point:", pointManager.getPoints()[0]);

        uiManager.renderPointsList(viewer, pointManager, true);
        uiManager.setupScrollPagination(pointManager);
    });

    // Canvas click handler
    viewer.addHandler('canvas-click', function(event) {
        pointManager.setSelectedPoint(null);
        pointManager.redraw();
    });

    // Add annotation (E key)
    document.addEventListener("keydown", async (e) => {
        if (e.key.toLowerCase() !== ADD_ANNOTATION_KEY) return;

        const pos = getMouseImagePosition(viewer, lastMousePos);
        if (!pos) return;

        if (isPointAnnotate) {
            pointManager.addPoint(pos.x, pos.y);
            const success = await addPointToServer(imageId, pos.x, pos.y);
            
            if (success) {
                totalEggs++;
                uiManager.setEggCount(totalEggs);
            }

            pointManager.redraw();
            uiManager.renderPointsList(viewer, pointManager, true);

        } else if (isRectAnnotate) {
            const edgeCount = rectManager.addEdge(pos.x, pos.y);

            if (edgeCount === 1) {
                console.log("First corner placed");
            } else if (edgeCount === 2) {
                const edges = rectManager.getEdges();
                rectManager.hidePreview();
                rectManager.addRect(edges[0][0], edges[0][1], edges[1][0], edges[1][1]);

                const success = await addRectToServer(
                    imageId,
                    edges[0][0],
                    edges[0][1],
                    edges[1][0],
                    edges[1][1]
                );

                if (success) {
                    totalEggs++;
                    uiManager.setEggCount(totalEggs);
                }

                rectManager.clearEdges();
                uiManager.renderRectList(viewer, rectManager);
            }
        }
    });

    // Delete annotation (R key)
    document.addEventListener("keydown", async (e) => {
        if (e.key.toLowerCase() !== DELETE_ANNOTATION_KEY) return;

        const pos = getMouseImagePosition(viewer, lastMousePos);
        if (!pos) return;

        if (isPointAnnotate) {
            const removed = pointManager.removePointAt(pos.x, pos.y, 10);
            if (removed) {
                const success = await removePointFromServer(imageId, removed.x, removed.y);
                
                if (success) {
                    totalEggs--;
                    uiManager.setEggCount(totalEggs);
                }

                pointManager.redraw();
                uiManager.renderPointsList(viewer, pointManager, true);
            }

        } else if (isRectAnnotate) {
            const rect = rectManager.findRectAtPoint(pos.x, pos.y);
            if (rect) {
                const success = await removeRectFromServer(
                    imageId,
                    rect.x,
                    rect.y,
                    rect.x + rect.width,
                    rect.y + rect.height
                );

                if (success) {
                    totalEggs--;
                    uiManager.setEggCount(totalEggs);
                }

                rectManager.removeRect(rect);
                console.log("Rectangle deleted");
            }
        }
    });

    // Fill grid cell (F key)
    window.addEventListener("keydown", (e) => {
        if (e.key.toLowerCase() !== FILL_CELL_KEY) return;

        const pos = getMouseImagePosition(viewer, lastMousePos);
        if (!pos) return;

        gridManager.toggleCell(pos.x, pos.y);
    });

    // Mode buttons
    $("#point-btn").on("click", function () {
        isPointAnnotate = true;
        isRectAnnotate = false;

        uiManager.setMode("Point");
        uiManager.clearList();
        
        pointManager.setVisible(true);
        uiManager.renderPointsList(viewer, pointManager, true);
        rectManager.hideAll();
    });

    $("#rect-btn").on("click", function () {
        isPointAnnotate = false;
        isRectAnnotate = true;

        uiManager.setMode("Rectangle");
        uiManager.clearList();
        
        uiManager.renderRectList(viewer, rectManager);
        rectManager.restoreAll();
        pointManager.setVisible(false);
    });

    $("#grid-btn").on("click", function () {
        const isVisible = gridManager.isVisible();
        gridManager.setVisible(!isVisible);
    });
});