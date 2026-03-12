import { ContextMenu } from "./ContextMenu.js";
import { Utils } from "./Utils.js";

/**
 * -----------------------------------------
 * BATCH CONTEXT MENU
 * -----------------------------------------
 * Extends the generic ContextMenu to provide
 * rename and delete functionality for batch
 * rows in a table.
 */

/**
 * Context menu for batch table rows with rename/delete options.
 * @extends ContextMenu
 */
export class BatchContextMenu extends ContextMenu {

    /**
     * @param {Function} recalcTotals - Callback to recalculate totals after deletion.
     */
    constructor(recalcTotals) {
        super("custom-context-menu", "#batchTable tbody tr");
        /**
         * Callback to recalculate totals when a batch is deleted.
         * @type {Function}
         */
        this.recalcTotals = recalcTotals;
        this._bindRename();
        this._bindDelete();
    }

    /**
     * Resolve the batch ID from a row element.
     * @private
     * @param {HTMLElement} row - Table row element.
     * @returns {string} Batch ID.
     */
    _resolveId(row) { return $(row).attr("data-batch-id"); }

    /**
     * Bind rename functionality to the "Rename" menu item.
     * @private
     */
    _bindRename() {
        $(`#menu-rename`).on("click", () => {
            if (!this.targetRow) return;

            const $cell       = $(this.targetRow).children().first();
            const currentName = $cell.text().trim();
            if ($cell.find("input").length) return;

            const $input = $('<input type="text">').val(currentName).css({ width: "100%", padding: "4px", fontSize: "14px" });
            $cell.empty().append($input);
            $input.focus().select();

            let saved = false;

            const save = () => {
                if (saved) return;
                saved = true;

                const newName = $input.val().trim();
                if (!newName || newName === currentName) { $cell.text(currentName); return; }

                fetch(`/edit-batch-name/${this.targetId}/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "X-CSRFToken": Utils.getCSRFToken() },
                    body: JSON.stringify({ batch_name: newName }),
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        $cell.text(newName);
                    } else {
                        alert("Failed to update batch name: " + (data.message || "Unknown error"));
                        $cell.text(currentName);
                    }
                })
                .catch(err => { console.error(err); $cell.text(currentName); });
            };

            $input.on("keydown", (e) => {
                if (e.key === "Enter")  save();
                if (e.key === "Escape") { $cell.text(currentName); saved = true; }
            }).on("blur", save);
        });
    }
    
    /**
     * Bind delete functionality to the "Delete" menu item.
     * @private
     */
    _bindDelete() {
        $("#menu-delete").on("click", () => {
            if (!this.targetId || !this.targetRow) return;

            if (confirm("Are you sure you want to delete this entire batch?")) {
                fetch(`/delete-batch/${this.targetId}/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "X-CSRFToken": Utils.getCSRFToken() },
                })
                .then(response => {
                    if (response.ok) {
                        $(this.targetRow).remove();
                        this.recalcTotals();
                    } else {
                        alert("Failed to delete batch.");
                    }
                })
                .catch(err => console.error("Error:", err));
            }
        });
    }
}