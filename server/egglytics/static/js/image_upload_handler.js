// Global var
let fileArray = [];
let index_holder = null;

// Model Names
const models = [
  { value: "polyegg_heatmap", label: "Points" },
  { value: "free_annotate", label: "Free Annotate" },
  { value: "reserved", label: "RESERVED SLOT FOR DEVS" }
];

// Load Model names into HTML header

const $allModel = $("#all_model");
  // Populate options
  $.each(models, function (i, model) {
    $allModel.append(
      $("<option>", { value: model.value, text: model.label })
    );
  });

  // Default value
$allModel.val("polyegg_heatmap");



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

    // Set the default batch name
    const now = new Date();
    const datePart = now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0');

    const timePart = String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0');
    const millis = String(now.getMilliseconds()).padStart(3, '0');
    const batchValue = datePart + "_" + timePart + "_" + millis;
    $("#batch_name").val(batchValue);

    // Set the username, the previous value.
    $(function () {
        const savedUser = localStorage.getItem("username");
        if (savedUser) {
            $("#user_name").val(savedUser);
        }
    });

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
        const MAX_FILES = 100;
        // Maximum file size
        const MAX_SIZE_PER_FILE = 500 * 1024 * 1024;

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

            const isMacro = (file.size / (1024 * 1024)) >= 1;  // true if ≥ 1MB

            modeCell.innerHTML = `
                <label class="text-switch">
                    <input 
                        type="checkbox" 
                        class="mode-toggle" 
                        name="mode${index}" 
                        ${isMacro ? "checked" : ""}
                    >
                    <span class="text-slider">
                        <span class="text-micro">Micro</span>
                        <span class="text-macro">Macro</span>
                    </span>
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

            // Model dropdown
            const modelCell = document.createElement("td");

            const modelSelect = document.createElement("select");
            modelSelect.className = "limited-width-select";
            modelSelect.name = `model${index}`;
            modelSelect.setAttribute("data-row-model", "true");

            // Populate from models array
            models.forEach((model, i) => {
            const option = document.createElement("option");
            option.value = model.value;
            option.textContent = model.label;

            // Default selection (first model or specific one)
            if (model.value === "polyegg_heatmap") {
                option.selected = true;
            }

            modelSelect.appendChild(option);
            });

            modelCell.appendChild(modelSelect);

            
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
            row.appendChild(editCell);
            row.appendChild(modelCell);
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

    // Handle Global Mode Toggle
    $(document).on("change", "#all_mode_toggle", function () {
        const isChecked = $(this).is(":checked");
        // Set all row toggles to match the header toggle
        $(".mode-toggle").prop("checked", isChecked);
    });

    $(document).on("change", ".mode-toggle", function () {
        $("#all_mode_toggle").prop("checked", false);
    });


    // Handle global model toggle
    $("#all_model").on("change", function() {
        const newValue = $(this).val();  // get selected value
        $('select[data-row-model="true"]').each(function() {
            $(this).val(newValue);       // update each row
        });
    });




    $("#saveBtn").on("click", function(e) {
        console.log(index_holder);
        performSave(index_holder);

        // Find the corresponding row
        const rows = document.querySelectorAll("tbody tr");
        const targetRow = rows[index_holder];

        if (targetRow) {
            targetRow.style.backgroundColor = "#c8e6c9";
        }
    });
    function showDeleteConfirmation(index) {
        const mainContent = document.querySelector(".main-content");
        if (!mainContent) {
            console.error("Main content container not found!");
            return;
        }

        const existingModal = mainContent.querySelector(".confirm-modal");
        if (existingModal) existingModal.remove();

        const confirmModal = document.createElement("div");
        confirmModal.classList.add("confirm-modal");

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

        $("#upload-table tbody tr").each(function(index) {
            const $row = $(this);

            const file = fileArray[index];
            if (!file) return;

            formData.append("myfiles", file);

            const model = $row.find('select[data-row-model="true"]').val();
            formData.append(`model_${index}`, model);

            const isMacro = $row.find('.mode-toggle').is(":checked");
            const mode = isMacro ? "macro" : "micro";
            formData.append(`mode_${index}`, mode);
        });

        // --- Append user ---
        const user = $("#user_name").val().trim().toLowerCase();
        const name = $("#batch_name").val().trim().toLowerCase();
        formData.append("username", user);

        // Optional: save to localStorage for next time
        localStorage.setItem("username", user);

        formData.append("file_count", fileArray.length);
        formData.append("user",user);
        formData.append("batch_name",name);

        console.log(user,name)

        // Show progress bar
        $("#upload-progress-container").show();
        $("#upload-progress").css("width", "0%");
        // Save the username.





        $.ajax({
            url: "/",
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            headers: {
                "X-CSRFToken": getCSRFToken(),
            },
            xhr: function() {
                const xhr = new window.XMLHttpRequest();
                xhr.upload.addEventListener("progress", function(evt) {
                    if (evt.lengthComputable) {
                        const percentComplete = Math.round((evt.loaded / evt.total) * 100);
                        $("#upload-progress").css("width", percentComplete + "%");
                        $("#upload-progress").text(percentComplete + "%");
                    }
                }, false);
                return xhr;
            },
            success: function (response) {
                console.log("Uploaded files:", response.filenames);

                fileArray = []; 
                document.querySelector("#upload-table tbody").innerHTML = "";
                updateSubmitButtonVisibility();

                // Hide progress bar
                $("#upload-progress-container").hide();
                $("#upload-progress").css("width", "0%");

                localStorage.setItem("flag", JSON.stringify({ processingActive: true }));
                window.location.href = "/view";
            },
            error: function (xhr, status, error) {
                console.error("Upload failed:", error);
                alert("Upload failed. Please try again.");
                $("#upload-progress-container").hide();
                $("#upload-progress").css("width", "0%");
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


