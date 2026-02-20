import { ContextMenu } from "./ContextMenu.js";
import { Utils } from "./Utils.js";

export class BatchContextMenu extends ContextMenu {
    constructor(recalcTotals) {
        super("custom-context-menu", "#batchTable tbody tr");
        this.recalcTotals = recalcTotals;
        this._bindRename();
        this._bindDelete();
    }

    _resolveId(row) { return $(row).attr("data-batch-id"); }

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