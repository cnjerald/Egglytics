
import { Utils } from "./Utils.js";

/**
 * Handles batch deletion from the table.
 */
export class BatchDelete {
    /**
     * @param {Function} recalcTotals - Callback to recalculate totals after a batch is deleted.
     */
    constructor(recalcTotals) {
        /**
         * Callback function to recalculate totals after deletion.
         * @type {Function}
         */
        this.recalcTotals = recalcTotals;

        $(document).on("click", "#batchTable .delete-btn", (e) => {
            e.stopPropagation();

            const $btn    = $(e.currentTarget);
            const batchId = $btn.data("batch-id");

            if (confirm("Are you sure you want to delete this batch?")) {
                fetch(`/delete-batch/${batchId}/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "X-CSRFToken": Utils.getCSRFToken() },
                })
                .then(response => {
                    if (response.ok) {
                        $btn.closest("tr").remove();
                        this.recalcTotals();
                    } else {
                        alert("Failed to delete batch.");
                    }
                });
            }
        });
    }
}