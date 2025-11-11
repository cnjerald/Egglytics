// Global var
let fileArray = [];
let index_holder = null;

// Global func..
function performSave(index) {
    const img = document.getElementById('cropImage');
    if (!img) {
        console.error("Crop image not found!");
        return;
    }

    if (index == null) {
        console.error("No index set for saving!");
        return;
    }

    const dataUrl = img.src;
    if (!dataUrl || !dataUrl.startsWith("data:image/")) {
        console.warn("Nothing to save — image not cropped or invalid data URL.");
        return;
    }

    // Convert dataURL back to a File
    const newFile = dataURLtoFile(dataUrl, fileArray[index].name);
    if (!newFile) {
        console.warn("Failed to convert cropped image to file.");
        return;
    }

    // Replace file in the array
    fileArray[index] = newFile;

    // Update table row
    const row = document.querySelector(`#upload-table tbody tr[data-id="${index + 1}"]`);
    if (row) {
        const previewImg = row.querySelector("td img");
        if (previewImg) {
            previewImg.src = URL.createObjectURL(newFile);
        }

        const sizeCell = row.querySelectorAll("td")[2];
        if (sizeCell) {
            sizeCell.textContent = (newFile.size / (1024 * 1024)).toFixed(2) + " MB";
        }
    }

    // Close modal and reset UI
    modal.style.display = "none";
    resetInterface();
}

$(document).ready(function () {
    const $dropArea = $('#drop-area');
    const $fileInput = $('#myfile');
    const $previewContainer = $('#uploaded-image');

    function updateSubmitButtonVisibility() {
        //console.log("DEBUG: updateSubmitButtonVisibility() called. Files:", document.querySelector('#upload-table tbody').children.length);

        const tableBody = document.querySelector('#upload-table tbody');
        const submitButton = document.getElementById('upload-btn');
        
        if (!tableBody || !submitButton) return;

        // Show button if there is at least one row, otherwise hide it
        if (tableBody.children.length > 0) {
            submitButton.style.display = 'inline-block'; 
        } else {
            submitButton.style.display = 'none';
        }
    }

    // <-- These section handles the effects of the upload -->
    // Drag hover styling
    $dropArea.on('dragenter dragover', function (e) {
        e.preventDefault();
        e.stopPropagation();
        $dropArea.addClass('highlight');
    });

    $dropArea.on('dragleave drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        $dropArea.removeClass('highlight');
    });

    // Drop files
    $dropArea.on('drop', function (e) {
        const files = e.originalEvent.dataTransfer.files;
        handleFiles(files);
    });
    // <-- SECTION END -->

    // File picker
    $fileInput.on('change', function () {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        // SECTION =========== CONSTANTS =========== 
        // Maximum file count
        const MAX_FILES = 15;
        // Maximum file size
        const MAX_SIZE_PER_FILE = 200 * 1024 * 1024;

        // SECTION =========== CHECKS THE UPLOAD =========== 
        // Check file count
        if (fileArray.length + files.length <= MAX_FILES) {
            // Filter: keep only files that are .jpg/.jpeg/.png and within size limit
            const validFiles = Array.from(files).filter(file => {
                const isValidSize = file.size <= MAX_SIZE_PER_FILE;
                const isValidType = /\.(jpe?g|png)$/i.test(file.name);
                return isValidSize && isValidType;
            });

            // Add valid files only
            fileArray = fileArray.concat(validFiles);
        } else {
            alert("DEBUG: TOO MANY FILES!");
        }

        // Error handling for a rare case.
        if (fileArray.length === 0) {
            console.log("Case: Empty upload");
            updateSubmitButtonVisibility();
            return;
        }



        // SECTION CREATE A FILE VIEW TABLE
        // select the container

        // SECTION =========== POPULATE TABLE ===========
        const tbody = document.querySelector("#upload-table tbody");
        tbody.innerHTML = ""; // Clear old rows if needed

        fileArray.forEach((file, index) => {
            const row = document.createElement("tr");
            row.dataset.id = index + 1;

            // Preview image
            const imgCell = document.createElement("td");
            const img = document.createElement("img");
            img.src = URL.createObjectURL(file);
            img.alt = "preview";
            img.width = 60;
            imgCell.appendChild(img);

            // File name
            const nameCell = document.createElement("td");

            // create a wrapper div to allow ellipsis
            const nameWrap = document.createElement("div");
            nameWrap.className = "filename";
            nameWrap.textContent = file.name;
            nameWrap.title = file.name;  // tooltip shows full filename on hover

            nameCell.appendChild(nameWrap);

            // File size (pretty format)
            const sizeCell = document.createElement("td");
            sizeCell.textContent = (file.size / (1024 * 1024)).toFixed(2) + " MB";

            // Micro/Macro radio buttons
            const modeCell = document.createElement("td");
            modeCell.innerHTML = `
                <label>
                <input type="radio" name="mode${index}" value="micro" checked> Micro
                </label>
                <label>
                <input type="radio" name="mode${index}" value="macro"> Macro
                </label>
            `;

            // Sharing toggle
            const shareCell = document.createElement("td");
            shareCell.innerHTML = `
                <label class="switch">
                <input type="checkbox" class="share-toggle" name="share${index}">
                <span class="slider round"></span>
                </label> 
            `;

            // Edit button
            const editCell = document.createElement("td");
            const editBtn = document.createElement("button");

            editBtn.type = "button";
            editBtn.className = "demo-btn success"; // add classes
            editBtn.textContent = "Edit"; // button label

            editCell.appendChild(editBtn);

            editBtn.onclick = () => {
                index_holder = index;
                console.log(index);
                openCropperWithImage(img.src, index);
            };
            
            // Delete button
            const deleteCell = document.createElement("td");
            const deleteBtn = document.createElement("button");

            deleteBtn.type = "button";
            deleteBtn.className = "demo-btn danger"; // maybe use 'danger' for clarity
            deleteBtn.textContent = "X";

            deleteCell.appendChild(deleteBtn);

            // Corrected event handler
            deleteBtn.onclick = () => {
                index_holder = index;
                showDeleteConfirmation(index);
            };

            // Append all cells to row
            row.appendChild(imgCell);
            row.appendChild(nameCell);
            row.appendChild(sizeCell);
            row.appendChild(modeCell);
            row.appendChild(shareCell);
            row.appendChild(editCell);
            row.appendChild(deleteCell);
            // Add row to table
            tbody.appendChild(row);
        });
        updateSubmitButtonVisibility();
    }

    $("#all_micro").on("change", function () {

        if ($(this).is(":checked")) {
            // exclude the global itself
            $('input[type="radio"][value="micro"]').not("#all_micro").each(function () {
            $(this).prop("checked", true);
            });
        }
    });

    $("#all_macro").on("change", function () {
        if ($(this).is(":checked")) {
            $('input[type="radio"][value="macro"]').not("#all_macro").each(function () {
            $(this).prop("checked", true);
            });
        }
    });

    // uncheck both global mode radios
    $(document).on("change", 'input[type="radio"][name^="mode"]', function () {
        $("#all_micro, #all_macro").prop("checked", false);
    });

    // Handle global share toggle
    $("#all_share").on("change", function () {
        const isChecked = $(this).is(":checked");
        $(".share-toggle").prop("checked", isChecked);
    });

    // When any individual share toggle changes, uncheck the global
    $(document).on("change", ".share-toggle", function () {
        $("#all_share").prop("checked", false);
    });

    $("#saveBtn").on("click", function(e) {
        console.log(index_holder);
        performSave(index_holder);

        // Find the corresponding row
        const rows = document.querySelectorAll("tbody tr");
        const targetRow = rows[index_holder];

        if (targetRow) {
            // Add a green highlight (e.g., light green background)
            targetRow.style.backgroundColor = "#c8e6c9"; // soft green tone
        }
    });
    function showDeleteConfirmation(index) {
        console.log("HELLO!");
        const mainContent = document.querySelector(".main-content");
        if (!mainContent) {
            console.error("Main content container not found!");
            return;
        }

        // Remove any existing modal first (just in case)
        const existingModal = mainContent.querySelector(".confirm-modal");
        if (existingModal) existingModal.remove();

        // Create modal
        const confirmModal = document.createElement("div");
        confirmModal.classList.add("confirm-modal");

        // Build inner content with unique scoped elements (no IDs)
        const content = document.createElement("div");
        content.classList.add("confirm-content");
        content.innerHTML = `
            <p>Are you sure you want to delete this file?</p>
            <div class="confirm-actions">
            <button class="confirm-yes demo-btn danger">Yes</button>
            <button class="confirm-cancel demo-btn">Cancel</button>
            </div>
        `;
        confirmModal.appendChild(content);
        mainContent.appendChild(confirmModal);

        // Attach event handlers safely
        const yesBtn = content.querySelector(".confirm-yes");
        const cancelBtn = content.querySelector(".confirm-cancel");

        yesBtn.addEventListener("click", () => {
            deleteEntry(index);
            confirmModal.remove();
        });

        cancelBtn.addEventListener("click", () => {
            confirmModal.remove();
        });
    }



    function deleteEntry(index) {
        // Remove file from array
        fileArray.splice(index, 1);

        // Remove row from DOM
        const tbody = document.querySelector("#upload-table tbody");
        const rowToRemove = tbody.querySelector(`tr[data-id="${index + 1}"]`);
        if (rowToRemove) tbody.removeChild(rowToRemove);

        // Reindex rows and handlers
        const rows = tbody.querySelectorAll("tr");
        rows.forEach((row, newIndex) => {
            row.dataset.id = newIndex + 1;

            const editBtn = row.querySelector(".demo-btn.success");
            const deleteBtn = row.querySelector(".demo-btn.danger");

            if (editBtn) {
                editBtn.onclick = () => {
                    index_holder = newIndex;
                    const img = row.querySelector("img");
                    openCropperWithImage(img.src, newIndex);
                };
            }

            if (deleteBtn) {
                deleteBtn.onclick = () => {
                    index_holder = newIndex;
                    showDeleteConfirmation(newIndex);
                };
            }
        });

        updateSubmitButtonVisibility();
        if (index_holder === index) index_holder = null;
        console.log(`Deleted entry ${index}. Remaining files:`, fileArray.length);
    }



    
    $("#upload-btn").on("click", function (e) {
        e.preventDefault();

        const formData = new FormData();

        fileArray.forEach(file => {
                const reader = new FileReader();
                reader.readAsDataURL(file);              
                  // Append to FormData using key "myfiles"
                formData.append('myfiles', file);
        })

        $.ajax({
            url: "/",
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            headers: {
                "X-CSRFToken": getCSRFToken(),
            },
            success: function (response) {
                console.log("Uploaded files:", response.filenames);

                fileArray = []; 
                document.querySelector("#upload-table tbody").innerHTML = "";
                updateSubmitButtonVisibility()
                // This flag acts as a way to send a message to the /view, where it will tell the user that there is an ongoing computation.
                localStorage.setItem("flag", JSON.stringify({ processingActive: true }));
                // Redirect after successful upload
                window.location.href = "/view";
            },
            error: function (xhr, status, error) {
                console.error("Upload failed:", error);
            }
        });
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
    updateSubmitButtonVisibility();
});
