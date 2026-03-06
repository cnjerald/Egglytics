/**
 * -----------------------------------------
 * CONTEXT MENU BASE CLASS
 * -----------------------------------------
 * Provides a reusable right-click context menu for table rows.
 * Handles menu display, hover effects, and tracking of the clicked row.
 */

export class ContextMenu {
    /**
     * @param {string} menuId - The HTML id of the context menu element.
     * @param {string} triggerSelector - CSS selector for table rows or elements that trigger the menu.
     */
    constructor(menuId, triggerSelector) {
        /**
         * jQuery object for the context menu element.
         * @type {JQuery<HTMLElement>}
         */
        this.$menu       = $(`#${menuId}`);
        /**
         * The row element that was right-clicked.
         * @type {HTMLElement|null}
         */
        this.targetRow   = null;
        /**
         * The identifier associated with the target row.
         * Typically resolved via a subclass implementation of _resolveId.
         * @type {string|null}
         */
        this.targetId    = null;

        // Show on right-click
        $(document).on("contextmenu", triggerSelector, (e) => {
            const row = $(e.target).closest("tr")[0];
            if (!row) return;
            e.preventDefault();

            this.targetRow = row;
            this.targetId  = this._resolveId(row);

            this.$menu.css({ display: "block", left: e.clientX, top: e.clientY });
        });

        // Hide on any click
        $(document).on("click", () => this.$menu.hide());

        // Hover effect
        this.$menu.find("li")
            .on("mouseover", (e) => $(e.currentTarget).css("background-color", "#f1f1f1"))
            .on("mouseout",  (e) => $(e.currentTarget).css("background-color", "transparent"));
    }

    /**
     * Resolve the ID of the target element from a table row.
     * Override this in subclasses for custom logic (e.g., batch vs image ID).
     *
     * @param {HTMLElement} row - The table row element.
     * @returns {string|null} The ID associated with the row.
     */
    _resolveId(row) {
        return $(row).attr("data-batch-id") || $(row).attr("data-image-id");
    }
}