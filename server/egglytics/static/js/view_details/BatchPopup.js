
import { Utils } from "./Utils.js";
export class BatchPopup {
    constructor(recalcTotals) {
        this.recalcTotals = recalcTotals;
        this.totalEggs    = 0;
        this.totalHatched = 0;

        this._bindRowClicks();
        this._bindImageSelection();
        this._bindPopupClose();
        this._bindDeleteInPopup();
        this._bindEditBatchName();

    }

    open(batchId, batchName) {
        const $popup = $("#popup");
        $popup.data("batchId", batchId);
        $("#popup-batch-name").text(batchName);
        $("#popup-text").show();
        $popup.css("display", "flex");

        fetch(`/batch/${batchId}/images/`)
            .then(res => res.json())
            .then(data => {
                if (data.length > 0) {
                    $("#popup-image").attr("src", data[0].image_url);
                }

                this.totalEggs    = data.reduce((s, img) => s + img.total_eggs, 0);
                this.totalHatched = data.reduce((s, img) => s + img.total_hatched, 0);

                $("#eggs-header").text(`Eggs (Total: ${this.totalEggs})`);
                $("#hatched-header").text(`Hatched (Total: ${this.totalHatched})`);

                let rowsHTML = "";
                data.forEach((img, index) => {
                    rowsHTML += `
                        <tr class="image-details ${index === 0 ? 'selected' : ''}"
                            data-image-name="${img.image_name}"
                            data-image-id="${img.image_id}"
                            data-image-path="${img.image_path}">
                            <td class="filename" data-image-id="${img.image_id}">${img.image_name}</td>
                            <td>${img.total_eggs}</td>
                            <td class="editable-hatched" data-image-id="${img.image_id}">${img.total_hatched}</td>
                            <td>${img.img_type}</td>
                            <td>
                                ${img.is_processed
                                    ? `<button class="edit-btn" onclick="event.stopPropagation(); window.location.href='/editor/${img.image_id}/'">Edit</button>`
                                    : `<h5 style="margin:0;color:#888;">IN PROCESS</h5>`}
                            </td>
                            <td><button class="delete-btn"><i class="fas fa-trash"></i></button></td>
                        </tr>`;
                });

                $("#popup-details").html(rowsHTML);
            })
            .catch(err => {
                $("#popup-text").text(`Error loading images for: ${batchName}`);
                console.error(err);
            });
    }

    close() {
        $("#popup").hide();
    }

    _bindRowClicks() {
        $(document).on("click", "#batchTable tbody tr", (e) => {
            const $row = $(e.currentTarget);
            $("#batchTable tbody tr").removeClass("selected");
            $row.addClass("selected");

            const batchId   = $row.attr("data-batch-id");
            const batchName = $row.children().first().text();
            this.open(batchId, batchName);
        });
    }

    _bindImageSelection() {
        $(document).on("click", ".image-details", function () {
            $(".image-details").removeClass("selected");
            $(this).addClass("selected");

            const imagePath  = $(this).attr("data-image-path");
            const $popupImg  = $("#popup-image");

            $popupImg.css("opacity", "0.3");

            const newImage  = new Image();
            newImage.onload = function () {
                $popupImg.attr("src", `/thumbnail/${imagePath}?w=800&h=600`).css("opacity", "1");
            };
            newImage.src = `/thumbnail/${imagePath}?w=800&h=600`;
        });
    }

    _bindDeleteInPopup() {
        $(document).on("click", ".popup .delete-btn", (e) => {
            e.stopPropagation();

            const $row          = $(e.currentTarget).closest("tr");
            const imageId       = $row.data("image-id");
            const currentPreview = $("#popup-image").attr("src");
            const imageUrl      = $row.data("image-url");
            const eggs          = parseInt($row.find("td:nth-child(2)").text(), 10) || 0;
            const hatched       = parseInt($row.find("td:nth-child(3)").text(), 10) || 0;

            if (!confirm("Are you sure you want to delete this image?")) return;

            fetch(`/delete-image/${imageId}/`, {
                method: "POST",
                headers: { "X-CSRFToken": Utils.getCSRFToken() },
            })
            .then(res => res.json())
            .then(data => {
                if (!data.success) { alert("Failed to delete image: " + data.message); return; }

                $row.remove();

                this.totalEggs    = Math.max(0, this.totalEggs    - eggs);
                this.totalHatched = Math.max(0, this.totalHatched - hatched);

                $("#eggs-header").text(`Eggs (Total: ${this.totalEggs})`);
                $("#hatched-header").text(`Hatched (Total: ${this.totalHatched})`);

                if (currentPreview === imageUrl) {
                    const $firstRow = $("#popup-details tr").first();
                    $("#popup-image").attr("src", $firstRow.length ? $firstRow.data("image-url") : "");
                }

                const batchId  = $("#popup").data("batch-id");
                if (data.batch_deleted) {
                    $(`#batchTable tbody tr[data-batch-id="${batchId}"]`).remove();
                    this.close();
                    alert("Last image deleted. Batch removed.");
                } else {
                    const $batchRow = $(`#batchTable tbody tr[data-batch-id="${batchId}"]`);
                    $batchRow.find("td:nth-child(3)").text(data.new_total_images);
                    $batchRow.find("td:nth-child(4)").text(data.new_total_eggs);
                }

                this.recalcTotals();
            })
            .catch(err => console.error(err));
        });
    }

    _bindEditBatchName() {
        $("#edit-batch-btn").on("click", () => {
            const $nameEl      = $("#popup-batch-name");
            const $editBtn     = $("#edit-batch-btn");
            const currentName  = $nameEl.text();

            $editBtn.hide();
            $nameEl.html(`
                <input type="text" id="batch-name-input" value="${currentName}" style="display:inline-block;"/>
                <span id="batch-name-edit-controls">
                    <button class="save-btn">&#10003;</button>
                    <button class="cancel-btn">&#10005;</button>
                </span>
            `);

            const $input     = $("#batch-name-input").focus();
            const $saveBtn   = $("#batch-name-edit-controls .save-btn");
            const $cancelBtn = $("#batch-name-edit-controls .cancel-btn");

            $saveBtn.on("click", () => {
                const newName = $input.val().trim();
                if (!newName) { alert("Batch name cannot be empty."); return; }

                const batchId = $("#popup").data("batchId");

                fetch(`/edit-batch-name/${batchId}/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "X-CSRFToken": Utils.getCSRFToken() },
                    body: JSON.stringify({ batch_name: newName }),
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        $nameEl.text(newName);
                        $editBtn.show();
                        $(`#batchTable tbody tr[data-batch-id="${batchId}"]`).children().first().text(newName);
                    } else {
                        alert("Failed to update batch: " + data.message);
                    }
                })
                .catch(err => console.error(err));
            });

            $cancelBtn.on("click", () => {
                $nameEl.text(currentName);
                $editBtn.show();
            });
        });
    }


    _bindPopupClose() {
        $("#popup").on("click", (e) => {
            if (!$(e.target).closest(".popup-content").length) this.close();
        });

        $(document).on("click", ".close-btn", () => this.close());
    }
}