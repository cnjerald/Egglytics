$(document).ready(function () {
    const $dropArea = $('#drop-area');
    const $fileInput = $('#myfile');
    const $previewContainer = $('#uploaded-image');
    let fileArray = [];
    let index_holder = null;

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
            nameCell.textContent = file.name;

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
            editBtn.textContent = "Open Cropper with Sample Image"; // button label
            editBtn.setAttribute("onclick", "openCropperWithSample()"); // set onclick attribute

            editCell.appendChild(editBtn);

            editBtn.onclick = () => {
                index_holder = index;
                console.log(index);
                openCropperWithImage(img.src, index);
            };

            // Append all cells to row
            row.appendChild(imgCell);
            row.appendChild(nameCell);
            row.appendChild(sizeCell);
            row.appendChild(modeCell);
            row.appendChild(shareCell);
            row.appendChild(editCell);

            // Add row to table
            tbody.appendChild(row);
        });
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

        // Convert back to File
        const newFile = dataURLtoFile(img.src, fileArray[index].name);

        // Replace in array
        fileArray[index] = newFile;

        // Update table row directly
        const row = document.querySelector(`#upload-table tbody tr[data-id="${index + 1}"]`);
        if (row) {
            // Update preview image
            const previewImg = row.querySelector("td img");
            previewImg.src = URL.createObjectURL(newFile);

            // Update file size cell (3rd column, index 2)
            const sizeCell = row.querySelectorAll("td")[2];
            sizeCell.textContent = (newFile.size / (1024 * 1024)).toFixed(2) + " MB";
        }
    }


    
    $("#upload-btn").on("click", function (e) {
        e.preventDefault();

        alert("HELLO WORLD!");
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
                handleFiles(files); // refresh table preview
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
});
