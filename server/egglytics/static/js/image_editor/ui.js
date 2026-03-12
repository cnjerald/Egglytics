/**
 * -----------------------------------------
 * UI MANAGER
 * -----------------------------------------
 * Handles UI rendering and updates for the
 * annotation interface.
 *
 * Responsibilities include:
 * - Updating the current annotation mode
 * - Displaying the egg count
 * - Managing the annotation list UI
 */
export class UIManager {
    /**
     * Creates a new UIManager instance.
     *
     * @param {HTMLElement} listEl - Element that displays the annotation list
     * @param {HTMLElement} modeEl - Element that displays the current mode
     * @param {HTMLElement} eggCountEl - Element that displays the egg count
     */
    constructor(listEl, modeEl, eggCountEl) {
        /** @type {HTMLElement} */
        this.listEl = listEl;
        /** @type {HTMLElement} */
        this.modeEl = modeEl;
        /** @type {HTMLElement} */
        this.eggCountEl = eggCountEl;
        /** @type {number} Number of items currently rendered in the list */
        this.renderedCount = 0;
        /** @type {number} Number of list items to render per page */
        this.pageSize = 50;
    }

    /**
     * Updates the current annotation mode displayed in the UI.
     *
     * @param {string} mode - The active annotation mode
     * ("Point", "Rectangle", etc.)
     */    
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

    /**
     * Updates the egg count display.
     *
     * @param {number} count - Number of detected or annotated eggs
     */
    setEggCount(count) {
        this.eggCountEl.innerHTML = "Egg Count: " + count;
    }

    /**
     * Clears the annotation list UI.
     * Also resets the internal render counter.
     */
    clearList() {
        this.listEl.innerHTML = "";
        this.renderedCount = 0;
    }





}