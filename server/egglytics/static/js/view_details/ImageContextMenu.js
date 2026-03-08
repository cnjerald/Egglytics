import { ContextMenu } from "./ContextMenu.js";
import { Utils } from "./Utils.js";


export class ImageContextMenu extends ContextMenu {
    constructor(popupInstance) {
        super("image-context-menu", "#popup-details tr");
        this.popup = popupInstance;
        this._bindRename();
        this._bindChangeHatched();
        this._bindDelete();
    }

    _resolveId(row) { return $(row).attr("data-image-id"); }

    _bindRename() {
        $("#image-menu-rename").on("click", () => {
            if (!this.targetRow) return;

            const $cell       = $(this.targetRow).find(".filename");
            if (!$cell.length || $cell.find("input").length) return;

            const currentName = $cell.text().trim();
            const $input      = $('<input type="text">').val(currentName).css({ width: "140px", padding: "4px", fontSize: "14px" });
            $cell.empty().append($input);
            $input.focus().select();

            let saved = false;

            const save = () => {
                if (saved) return;
                saved = true;

                const newName = $input.val().trim();
                if (!newName || newName === currentName) { $cell.text(currentName); return; }

                fetch(`/update-image-name/${this.targetId}/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "X-CSRFToken": Utils.getCSRFToken() },
                    body: JSON.stringify({ image_name: newName }),
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        $cell.text(newName);
                        $(this.targetRow).attr("data-image-name", newName);
                    } else {
                        alert("Failed to update image name: " + (data.message || "Unknown error"));
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

    _bindChangeHatched() {
        $("#image-menu-change-hatched").on("click", () => {
            if (!this.targetRow) return;

            const $cell          = $(this.targetRow).find("td:nth-child(3)");
            const currentHatched = $cell.text().trim();
            if ($cell.find("input").length) return;

            const $input = $('<input type="number">').val(currentHatched).attr("min", "0").css({ width: "80px", padding: "4px", fontSize: "14px" });
            $cell.empty().append($input);
            $input.focus().select();

            let saved = false;

            const save = () => {
                if (saved) return;
                saved = true;

                const newValue = parseInt($input.val(), 10);
                if (isNaN(newValue) || newValue < 0 || newValue.toString() === currentHatched) {
                    $cell.text(currentHatched);
                    return;
                }

                fetch(`/update-hatched/${this.targetId}/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "X-CSRFToken": Utils.getCSRFToken() },
                    body: JSON.stringify({ total_hatched: newValue }),
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        $cell.text(newValue);
                        const diff               = newValue - parseInt(currentHatched, 10);
                        this.popup.totalHatched  = Math.max(0, this.popup.totalHatched + diff);
                        $("#hatched-header").text(`Hatched (Total: ${this.popup.totalHatched})`);
                    } else {
                        alert("Failed to update hatched count: " + (data.message || "Unknown error"));
                        $cell.text(currentHatched);
                    }
                })
                .catch(err => { console.error(err); $cell.text(currentHatched); });
            };

            $input.on("keydown", (e) => {
                if (e.key === "Enter")  save();
                if (e.key === "Escape") { $cell.text(currentHatched); saved = true; }
            }).on("blur", save);
        });
    }

    _bindDelete() {
        $("#image-menu-delete").on("click", () => {
            if (!this.targetRow || !this.targetId) return;
            if (!confirm("Are you sure you want to delete this image?")) return;

            const $row           = $(this.targetRow);
            const currentPreview = $("#popup-image").attr("src");
            const imageUrl       = $row.data("image-url");
            const eggs           = parseInt($row.find("td:nth-child(2)").text(), 10) || 0;
            const hatched        = parseInt($row.find("td:nth-child(3)").text(), 10) || 0;

            fetch(`/delete-image/${this.targetId}/`, {
                method: "POST",
                headers: { "X-CSRFToken": Utils.getCSRFToken() },
            })
            .then(res => res.json())
            .then(data => {
                if (!data.success) { alert("Failed to delete image: " + data.message); return; }

                $row.remove();

                this.popup.totalEggs    = Math.max(0, this.popup.totalEggs    - eggs);
                this.popup.totalHatched = Math.max(0, this.popup.totalHatched - hatched);

                $("#eggs-header").text(`Eggs (Total: ${this.popup.totalEggs})`);
                $("#hatched-header").text(`Hatched (Total: ${this.popup.totalHatched})`);

                if (currentPreview === imageUrl) {
                    const $firstRow = $("#popup-details tr").first();
                    $("#popup-image").attr("src", $firstRow.length ? $firstRow.data("image-url") : "");
                }

                const batchId = $("#popup").data("batch-id");
                if (data.batch_deleted) {
                    $(`#batchTable tbody tr[data-batch-id="${batchId}"]`).remove();
                    this.popup.close();
                    alert("Last image deleted. Batch removed.");
                } else {
                    const $batchRow = $(`#batchTable tbody tr[data-batch-id="${batchId}"]`);
                    $batchRow.find("td:nth-child(3)").text(data.new_total_images);
                    $batchRow.find("td:nth-child(4)").text(data.new_total_eggs);
                }

                this.popup.recalcTotals();
            })
            .catch(err => console.error(err));
        });
    }
}