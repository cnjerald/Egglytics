// FOR PAGINATION
let currentPage = 1;
let rowsPerPage = 5;

function paginateTable() {
    const allRows = Array.from(document.querySelectorAll("#batchTable tbody tr"));
    const visibleRows = allRows.filter(row => row.getAttribute('data-filtered-out') !== 'true');
    
    const totalPages = Math.ceil(visibleRows.length / rowsPerPage) || 1;
    
    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    allRows.forEach(row => row.style.display = "none");

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    
    visibleRows.slice(start, end).forEach(row => {
        row.style.display = "";
    });

    document.getElementById("pageInfo").textContent = `Page ${currentPage} of ${totalPages}`;

    document.getElementById("prevPage").disabled = (currentPage === 1);
    document.getElementById("nextPage").disabled = (currentPage === totalPages);
}

document.getElementById("rowsPerPageSelect").addEventListener("change", function() {
    const value = this.value;
    rowsPerPage = parseInt(value, 10);
    
    currentPage = 1; // Reset to first page
    paginateTable();
});

document.getElementById("prevPage").addEventListener("click", () => {
    currentPage--;
    paginateTable();
});

document.getElementById("nextPage").addEventListener("click", () => {
    currentPage++;
    paginateTable();
});

$("#notice-box").hide();
    let flag = JSON.parse(localStorage.getItem("flag"));
    let totalHatched = 0;
    let totalEggs = 0;
    recalcTotals()

    // Show notice if processing is active
    if (flag?.processingActive) {
        $("#notice-box").html(`
            <h5>
                Your images are being processed. The results are updated every 30 seconds.<br>
                Processing Status: <i class="fas fa-spinner fa-spin" style="color: orange;"></i>
            </h5>
        `).show();
    }

    // Periodic batch status update
    updateBatchStatus(); // immediate call
    const poller = setInterval(updateBatchStatus, 15000);
    
    function updateBatchStatus() {
        fetch('/batch/status/latest/')
            .then(res => res.json())
            .then(batch => {
                if (!batch || !batch.id) {
                    $("#notice-box").html("<h5>No batches found</h5>").show();
                    return;
                }

                const row = document.querySelector(`#batchTable tbody tr[data-batch-id="${batch.id}"]`);
                if (row) {
                    const totalEggsCell = row.children[3]; // 4th column
                    totalEggsCell.textContent = batch.total_eggs;

                    const statusCell = row.children[4]; // 5th column
                    if (batch.is_complete && !batch.has_fail_present) {
                        statusCell.innerHTML = '<i class="fas fa-check-circle" style="color: green;"></i>';
                        if (getFlag()?.processingActive) {
                            $("#notice-box").html("<h5>Processing Complete! All images have been processed successfully</h5>").show();
                        }
                        clearInterval(poller); 
                        localStorage.removeItem("flag");
                    } else if (batch.is_complete) {
                        statusCell.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: red;"></i>';
                        if (getFlag()?.processingActive) {
                            $("#notice-box").html("<h5>Processing Complete! Some images have failed processing</h5>").show();
                        }
                        clearInterval(poller); 
                        localStorage.removeItem("flag");
                    } else if (batch.has_fail_present) {
                        statusCell.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: orange;"></i>';
                        if (getFlag()?.processingActive) {
                            $("#notice-box").html("<h5>Processing Ongoing! Some images have failed processing</h5>").show();
                        }
                        localStorage.removeItem("flag");
                    } else {
                        statusCell.innerHTML = '<i class="fas fa-spinner fa-spin" style="color: orange;"></i>';
                        $("#notice-box").html("<h5>Your images are being processed. The results are updated every 30 seconds.<br>Processing Status: <i class='fas fa-spinner fa-spin' style='color: orange;'></i></h5>").show();
                    }
                }
            })
            .catch(err => console.error(err));
    }

    // Table sorting
    document.querySelectorAll("#batchTable th").forEach((header, index) => {
        let ascending = true;
        header.addEventListener("click", () => {
            const table = header.closest("table");
            const tbody = table.querySelector("tbody");
            const rows = Array.from(tbody.querySelectorAll("tr"));

            rows.sort((a, b) => {
                let cellA = a.children[index].textContent.trim();
                let cellB = b.children[index].textContent.trim();

                // Try to parse numbers
                const numA = parseFloat(cellA.replace(/,/g, ""));
                const numB = parseFloat(cellB.replace(/,/g, ""));
                if (!isNaN(numA) && !isNaN(numB)) {
                    cellA = numA;
                    cellB = numB;
                }

                if (cellA < cellB) return ascending ? -1 : 1;
                if (cellA > cellB) return ascending ? 1 : -1;
                return 0;
            });

            rows.forEach(row => tbody.appendChild(row));
            ascending = !ascending;
        });
    });

    // Popup handling for table rows
    const popup = document.getElementById('popup');
    const popupText = document.getElementById('popup-text');
    const popupContent = document.querySelector('.popup-content');

    function openPopup(message) {
        popupText.textContent = message;
        popup.style.display = 'flex';
    }

    function closePopup() {
        popup.style.display = 'none';
    }

    popup.addEventListener('click', (e) => {
        if (!popupContent.contains(e.target)) closePopup();
    });

    // Click event for each batch row
    document.querySelectorAll("#batchTable tbody tr").forEach((row) => {
        row.addEventListener("click", () => {
            // checks if still processing
            const statusCell = row.children[4]; 
            // if (statusCell.querySelector('.fa-spinner')) {
            //     alert("Please wait until batch finishes processing");
            //     return; // Stop execution if processing is active
            // }
            // continues if not

            const batchId = row.getAttribute("data-batch-id");
            const batchName = row.children[0].textContent; // Get batch name from first column
            const popup = document.getElementById("popup");
            const popupText = document.getElementById("popup-text");
            const popupBatchName = document.getElementById("popup-batch-name");
            const editBatchBtn = document.getElementById("edit-batch-btn");
            const popupImage = document.getElementById("popup-image");
            const popupDetails = document.getElementById("popup-details");

            // Set popup header
            popup.dataset.batchId = batchId; // store batch id in popup
            popupBatchName.textContent = batchName; // update batch name text
            popupText.style.display = "inline"; 
            popup.style.display = "flex";

            // Fetch images for this batch
            fetch(`/batch/${batchId}/images/`)
                .then(res => res.json())
                .then(data => {
                    if (data.length > 0) {
                        popupImage.src = data[0].image_url;
                    }
                    totalEggs = data.reduce((sum, img) => sum + img.total_eggs, 0);
                    // This can be changed so not const
                    totalHatched = data.reduce((sum, img) => sum + img.total_hatched, 0);
                    
                    document.getElementById("eggs-header").textContent = `Eggs (Total: ${totalEggs})`;
                    document.getElementById("hatched-header").textContent = `Hatched (Total: ${totalHatched})`;

                    let rowsHTML = ""
                    data.forEach(img => {
                        rowsHTML += `
                            <tr class="image-details" 
                                data-image-name="${img.image_name}" 
                                data-image-id="${img.image_id}">
                                <td>${img.image_name}</td>
                                <td>${img.total_eggs}</td>
                                <td class="editable-hatched"
                                    data-image-id="${img.image_id}">
                                    ${img.total_hatched}
                                </td>
                                <td>${img.img_type}</td>
                                <td>
                                    <button class="edit-btn" 
                                        onclick="event.stopPropagation(); window.location.href='/editor/${img.image_id}/'">
                                        Edit
                                    </button>
                                </td>
                                <td>
                                    <button class="delete-btn">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                    });

                    popupDetails.innerHTML = rowsHTML;
                })
                .catch(err => {
                    popupText.textContent = `Error loading images for: ${batchName}`;
                    console.error(err);
                });
        });
    });


    // Change image on click inside popup
    $(document).on("click", ".image-details", function () {
        const imageName = $(this).data("image-name");
        $("#popup-image").attr("src", `${MEDIA_URL}uploads/${imageName}`);
    });

    // Advanced filtering: search + range filters
    const inputs = [
    "batchSearch",
    "dateFrom",
    "dateTo",
    "imagesMin",
    "imagesMax",
    "eggsMin",
    "eggsMax",
    ];

    inputs.forEach(id => {
    document.getElementById(id).addEventListener("input", applyFilters);
    });

    function applyFilters() {
        const searchQuery = document.getElementById("batchSearch").value.toLowerCase();
        const dateFrom = document.getElementById("dateFrom").value ? new Date(document.getElementById("dateFrom").value) : null;
        const dateTo = document.getElementById("dateTo").value ? new Date(document.getElementById("dateTo").value) : null;
        const imagesMin = parseFloat(document.getElementById("imagesMin").value) || 0;
        const imagesMax = parseFloat(document.getElementById("imagesMax").value) || Infinity;
        const eggsMin = parseFloat(document.getElementById("eggsMin").value) || 0;
        const eggsMax = parseFloat(document.getElementById("eggsMax").value) || Infinity;

        const rows = document.querySelectorAll("#batchTable tbody tr");

        rows.forEach(row => {
            const cells = row.children;
            const batchName = cells[0].textContent.toLowerCase();
            const dateText = cells[1].textContent.trim();
            const totalImages = parseFloat(cells[2].textContent.trim()) || 0;
            const totalEggs = parseFloat(cells[3].textContent.trim()) || 0;

            // Parse date (supports MM/DD/YYYY)
            const dateParts = dateText.split('/');
            const rowDate = new Date(`${dateParts[2]}-${dateParts[0]}-${dateParts[1]}`);

            // Check filters
            const matchesName = batchName.includes(searchQuery);
            const matchesDate =
            (!dateFrom || rowDate >= dateFrom) && (!dateTo || rowDate <= dateTo);
            const matchesImages = totalImages >= imagesMin && totalImages <= imagesMax;
            const matchesEggs = totalEggs >= eggsMin && totalEggs <= eggsMax;

            const isMatch = matchesName && matchesDate && matchesImages && matchesEggs;

            // Show only rows that match all conditions
            if (isMatch) {
                row.setAttribute('data-filtered-out', 'false');
            } else {
                row.setAttribute('data-filtered-out', 'true');
            }
        });
        currentPage = 1; // Reset to page 1 when filtering
        paginateTable();
        recalcTotals();
    }

    document.addEventListener("DOMContentLoaded", paginateTable);

    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            event.stopPropagation(); // Prevents row click event from firing
            const batchId = btn.dataset.batchId;
            if (confirm("Are you sure you want to delete this batch?")) {
                fetch(`/delete-batch/${batchId}/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": getCSRFToken(),
                    },
                }).then(response => {
                    if (response.ok) {
                        btn.closest("tr").remove();
                    } else {
                        alert("Failed to delete batch.");
                    }
                });
            }
        });
    });

    // Sorting logic for popup table
    document.addEventListener("click", (e) => {
        if (e.target.tagName === "TH") {
            const table = e.target.closest("table");
            const tbody = table.querySelector("tbody");
            const rows = Array.from(tbody.querySelectorAll("tr"));
            const column = e.target.cellIndex;
            const ascending = !e.target.classList.contains("asc");

            // Remove sort icons from all headers
            table.querySelectorAll("th").forEach(th => th.classList.remove("asc", "desc"));
            e.target.classList.add(ascending ? "asc" : "desc");

            rows.sort((a, b) => {
            const valA = a.children[column].textContent.trim();
            const valB = b.children[column].textContent.trim();

            // Detect numeric sorting
            const numA = parseFloat(valA);
            const numB = parseFloat(valB);

            if (!isNaN(numA) && !isNaN(numB)) {
                return ascending ? numA - numB : numB - numA;
            } else {
                return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            });

            // Reattach sorted rows
            rows.forEach(r => tbody.appendChild(r));
        }
    });

    // Handle delete button click inside popup
    $(document).on("click", ".popup .delete-btn", function (event) {
        event.stopPropagation();

        const row = $(this).closest("tr");
        const imageId = row.data("image-id");
        const currentPreview = $("#popup-image").attr("src");
        const imageUrl = row.data("image-url");

        // ✅ Read values BEFORE removing the row
        const eggs = parseInt(row.find("td:nth-child(2)").text(), 10) || 0;
        const hatched = parseInt(row.find("td:nth-child(3)").text(), 10) || 0;

        if (!confirm("Are you sure you want to delete this image?")) return;

        fetch(`/delete-image/${imageId}/`, {
            method: "POST",
            headers: { "X-CSRFToken": getCSRFToken() },
        })
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                alert("Failed to delete image: " + data.message);
                return;
            }

            // Remove row
            row.remove();

            // Update popup totals
            totalEggs -= eggs;
            totalHatched -= hatched;

            // Clamp to zero (safety)
            totalEggs = Math.max(0, totalEggs);
            totalHatched = Math.max(0, totalHatched);

            document.getElementById("eggs-header").textContent =
                `Eggs (Total: ${totalEggs})`;

            document.getElementById("hatched-header").textContent =
                `Hatched (Total: ${totalHatched})`;

            // Update preview
            if (currentPreview === imageUrl) {
                const firstRow = $("#popup-details tr").first();
                $("#popup-image").attr(
                    "src",
                    firstRow.length ? firstRow.data("image-url") : ""
                );
            }

            // Update main batch table
            if (data.batch_deleted) {
                const batchId = $("#popup").data("batch-id");
                $(`#batchTable tbody tr[data-batch-id="${batchId}"]`).remove();
                closePopup();
                alert("Last image deleted. Batch removed.");
            } else {
                const batchId = $("#popup").data("batch-id");
                const batchRow = $(`#batchTable tbody tr[data-batch-id="${batchId}"]`);
                batchRow.find("td:nth-child(3)").text(data.new_total_images);
                batchRow.find("td:nth-child(4)").text(data.new_total_eggs);
            }
        })
        .catch(err => console.error(err));
    });



    const popupBatchName = document.getElementById("popup-batch-name");
    const editBatchBtn = document.getElementById("edit-batch-btn");

    editBatchBtn.addEventListener("click", () => {
        const currentName = popupBatchName.textContent;
        
        // Replace text with input
        popupBatchName.innerHTML = `
            <input type="text" id="batch-name-input" value="${currentName}" />
            <span id="batch-name-edit-controls">
                <button class="save-btn">&#10003;</button>
                <button class="cancel-btn">&#10005;</button>
            </span>
        `;

        const input = document.getElementById("batch-name-input");
        const saveBtn = document.querySelector("#batch-name-edit-controls .save-btn");
        const cancelBtn = document.querySelector("#batch-name-edit-controls .cancel-btn");

        input.focus();

        // Save new name
        saveBtn.addEventListener("click", () => {
            const newName = input.value.trim();
            if (newName === "") {
                alert("Batch name cannot be empty.");
                return;
            }

            const batchId = document.getElementById("popup").dataset.batchId;

            fetch(`/edit-batch-name/${batchId}/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCSRFToken(),
                },
                body: JSON.stringify({ batch_name: newName }),
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    popupBatchName.textContent = newName;

                    // Also update main batch table
                    const batchRow = document.querySelector(`#batchTable tbody tr[data-batch-id="${batchId}"]`);
                    batchRow.children[0].textContent = newName;
                } else {
                    alert("Failed to update batch: " + data.message);
                }
            })
            .catch(err => console.error(err));
        });

        // Cancel editing
        cancelBtn.addEventListener("click", () => {
            popupBatchName.textContent = currentName;
        });
    });

    function recalcTotals() {
        let totalImages = 0;
        let totalEggs = 0;

        document.querySelectorAll("#batchTable tbody tr").forEach(row => {
            if (row.style.display !== "none") {
                totalImages += parseInt(row.children[2].innerText, 10) || 0;
                totalEggs += parseInt(row.children[3].innerText, 10) || 0;
            }
        });

        document.getElementById("total-images-header").innerText =
            `Total Images: ${totalImages}`;

        document.getElementById("total-eggs-header").innerText =
            `Total Eggs: ${totalEggs}`;
    }

    function getFlag() {
        return JSON.parse(localStorage.getItem("flag"));
    }

    document.addEventListener("dblclick", function (e) {
    const cell = e.target;

    if (!cell.classList.contains("editable-hatched")) return;

    const imageId = cell.dataset.imageId;
    const oldValue = parseInt(cell.textContent.trim(), 10) || 0;

    // Prevent multiple inputs
    if (cell.querySelector("input")) return;

    const input = document.createElement("input");
    input.type = "number";
    input.min = 0;
    input.value = oldValue;
    input.style.width = "60px";

    cell.textContent = "";
    cell.appendChild(input);
    input.focus();
    input.select();

    let saved = false;

    function save() {
        if (saved) return;
        saved = true;

        const newValue = input.value;

        if (newValue === "" || parseInt(newValue) === oldValue) {
            cell.textContent = oldValue;
            return;
        }

        fetch(`/update-hatched/${imageId}/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCSRFToken(),
            },
            body: JSON.stringify({ total_hatched: newValue })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const newVal = parseInt(newValue, 10);

                cell.textContent = newVal;

                totalHatched = totalHatched - oldValue + newVal;
                document.getElementById("hatched-header").textContent =
                    `Hatched (Total: ${totalHatched})`;
            } else {
                cell.textContent = oldValue;
            }
        })
        .catch(() => {
            cell.textContent = oldValue;
        });
    }


    input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cell.textContent = oldValue;
        });

        input.addEventListener("blur", save);
    });



    function getCSRFToken() {
        const name = 'csrftoken';
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = $.trim(cookies[i]);
            if (cookie.startsWith(name + '=')) {
                return decodeURIComponent(cookie.substring(name.length + 1));
            }
        }
        return '';
    }

