export class UploadHandler {
    constructor({ getFileArray, setFileArray, tableHandler }) {
        this.getFileArray = getFileArray;
        this.setFileArray = setFileArray;
        this.tableHandler = tableHandler;
        
        // Constants
        this.MAX_FILES = 100;
        this.MAX_SIZE_PER_FILE = 500 * 1024 * 1024; // 500 MB
    }

    /* ========================
       PUBLIC METHODS
    ======================== */

    handleFiles(files) {
        const fileArray = this.getFileArray();

        // Check file count
        if (fileArray.length + files.length > this.MAX_FILES) {
            alert(`Maximum ${this.MAX_FILES} files allowed!`);
            return;
        }

        // Filter valid files
        const validFiles = Array.from(files).filter(file => {
            const isValidSize = file.size <= this.MAX_SIZE_PER_FILE;
            const isValidType = /\.(jpe?g|png)$/i.test(file.name);
            
            if (!isValidType) {
                console.warn(`Skipping ${file.name}: Invalid file type`);
            }
            if (!isValidSize) {
                console.warn(`Skipping ${file.name}: File too large`);
            }
            
            return isValidSize && isValidType;
        });

        if (validFiles.length === 0) {
            console.log("No valid files to upload");
            return;
        }

        // Add valid files to array
        const newFileArray = fileArray.concat(validFiles);
        this.setFileArray(newFileArray);

        // Update table
        this.tableHandler.populateTable();
    }

    deleteFile(index) {
        const fileArray = this.getFileArray();
        
        // Remove file from array
        fileArray.splice(index, 1);

        // Remove row from DOM
        const tbody = document.querySelector("#upload-table tbody");
        const rowToRemove = tbody.querySelector(`tr[data-id="${index + 1}"]`);
        if (rowToRemove) tbody.removeChild(rowToRemove);

        // Reindex remaining rows
        this.tableHandler.reindexRows();
        this.tableHandler.updateSubmitButtonVisibility();

        console.log(`Deleted entry ${index}. Remaining files:`, fileArray.length);
    }

    async submitUpload() {
        const fileArray = this.getFileArray();
        const formData = new FormData();

        // Append files and their settings
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

        // Append metadata
        const user = $("#user_name").val().trim().toLowerCase();
        const name = $("#batch_name").val().trim().toLowerCase();
        
        formData.append("username", user);
        formData.append("user", user);
        formData.append("batch_name", name);
        formData.append("file_count", fileArray.length);

        // Save username for next time
        localStorage.setItem("username", user);

        console.log("Uploading:", user, name, fileArray.length, "files");

        // Show progress bar
        this.showProgress();

        return new Promise((resolve, reject) => {
            $.ajax({
                url: "/",
                type: "POST",
                data: formData,
                processData: false,
                contentType: false,
                headers: {
                    "X-CSRFToken": this.getCSRFToken(),
                },
                xhr: () => this.createXHRWithProgress(),
                success: (response) => {
                    console.log("Uploaded files:", response.filenames);
                    this.handleUploadSuccess();
                    resolve(response);
                },
                error: (xhr, status, error) => {
                    console.error("Upload failed:", error);
                    alert("Upload failed. Please try again.");
                    this.hideProgress();
                    reject(error);
                }
            });
        });
    }

    /* ========================
       PRIVATE METHODS
    ======================== */

    createXHRWithProgress() {
        const xhr = new window.XMLHttpRequest();
        xhr.upload.addEventListener("progress", (evt) => {
            if (evt.lengthComputable) {
                const percentComplete = Math.round((evt.loaded / evt.total) * 100);
                $("#upload-progress").css("width", percentComplete + "%");
                $("#upload-progress").text(percentComplete + "%");
            }
        }, false);
        return xhr;
    }

    showProgress() {
        $("#upload-progress-container").show();
        $("#upload-progress").css("width", "0%");
        $("#upload-progress").text("0%");
    }

    hideProgress() {
        $("#upload-progress-container").hide();
        $("#upload-progress").css("width", "0%");
    }

    handleUploadSuccess() {
        // Clear files and table
        this.setFileArray([]);
        this.tableHandler.clearTable();
        
        // Hide progress bar
        this.hideProgress();

        // Set flag and redirect
        localStorage.setItem("flag", JSON.stringify({ processingActive: true }));
        window.location.href = "/view";
    }

    getCSRFToken() {
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
}
