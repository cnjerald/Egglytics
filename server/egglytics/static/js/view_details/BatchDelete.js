
import { Utils } from "./Utils.js";

export class BatchDelete {
    constructor(recalcTotals) {
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