$(document).ready(function () {
    const $dropArea = $('#drop-area');
    const $fileInput = $('#myfile');
    const $previewContainer = $('#uploaded-image');
    let fileArray = [];
    let index_holder = null;

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
            // Filter out files that are too big
            const validFiles = Array.from(files).filter(file => 
                file.size <= MAX_SIZE_PER_FILE);
            
            // Add to array
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
                deleteEntry(index);
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

    $("#saveBtn").on("click",function(e){
        console.log(index_holder);
        performSave(index_holder);
    })

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


    function deleteEntry(index) {
        //Remove the file from the array
        fileArray.splice(index, 1);

        //Remove the row from the DOM directly
        const tbody = document.querySelector("#upload-table tbody");
        const rowToRemove = tbody.querySelector(`tr[data-id="${index + 1}"]`);
        if (rowToRemove) {
            tbody.removeChild(rowToRemove);
        }

        // Update the data-id attributes and button handlers below the deleted one
        const rows = tbody.querySelectorAll("tr");
        rows.forEach((row, newIndex) => {
            row.dataset.id = newIndex + 1;

            // Update the Edit and Delete buttons to match new indices
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
                    index_holder = newIndex
                    deleteEntry(newIndex);
                };
            }
        });

        // 4️ Hide or show the upload button
        updateSubmitButtonVisibility();

        // 5️ Clear index holder if it referenced the deleted item
        if (index_holder === index) {
            index_holder = null;
        }

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
                "X-CSRFToken": getCSRFToken()
            },
            success: function (response) {
                console.log("Uploaded files:", response.filenames);

                fileArray = []; 
                document.querySelector("#upload-table tbody").innerHTML = "";
                updateSubmitButtonVisibility()

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
