/**
 * UploadHandler
 * -------------
 * Manages file intake, validation, upload submission,
 * and synchronization with the table preview layer.
 *
 * Responsibilities:
 * - Validate selected image files (type + size)
 * - Maintain the staged upload file array
 * - Coordinate table updates after file changes
 * - Submit files and metadata to the backend
 * - Handle upload progress and success flow
 *
 * This module acts as the pipeline controller between:
 * File Input → TableHandler → Backend Upload API
 *
 * External Dependencies (DOM / Libraries):
 * - #upload-table tbody
 * - #upload-progress-container
 * - #upload-progress
 * - jQuery (AJAX + DOM helpers)
 * - localStorage
 *
 * Workflow:
 * File Selection → Validation → Table Sync → Upload → Redirect
 */

export class UploadHandler {

    /**
     * Creates an UploadHandler instance.
     *
     * @param {Object} options
     * @param {Function} options.getFileArray - Returns the staged file array.
     * @param {Function} options.setFileArray - Updates the staged file array.
     * @param {Object} options.tableHandler - TableHandler instance used for UI synchronization.
     */

    constructor({ getFileArray, setFileArray, tableHandler }) {
        /**
         * Callback to retrieve the current file array.
         * @type {Function}
         */
        this.getFileArray = getFileArray;
        /**
         * Callback to update the file array.
         * @type {Function}
         */
        this.setFileArray = setFileArray;
        /**
         * Table rendering controller.
         * @type {Object}
         */
        this.tableHandler = tableHandler;

        /**
         * Maximum allowed number of files per batch.
         * @type {number}
         */        
        // Constants
        this.MAX_FILES = 100;

        /**
         * Maximum allowed file size per file (bytes).
         * @type {number}
         */        
        this.MAX_SIZE_PER_FILE = 500 * 1024 * 1024; // 500 MB
    }

    /* ========================
       PUBLIC METHODS
    ======================== */

    /**
     * Validates incoming files and appends valid files
     * to the staged upload array.
     *
     * @param {FileList|File[]} files
     * @returns {void}
     */
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

    /**
     * Removes a file from the staged array and updates the table.
     *
     * @param {number} index
     * @returns {void}
     */
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

    /**
     * Submits all staged files and metadata to the server.
     * Handles progress visualization and redirect on success.
     *
     * @async
     * @returns {Promise<Object>}
     */
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

    /**
     * Creates an XMLHttpRequest instance with upload progress tracking (This is the progress bar)
     *
     * @returns {XMLHttpRequest}
     */
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

    /**
     * Displays the upload progress UI.
     *
     * @returns {void}
     */
    showProgress() {
        $("#upload-progress-container").show();
        $("#upload-progress").css("width", "0%");
        $("#upload-progress").text("0%");
    }

    /**
     * Hides the upload progress UI.
     *
     * @returns {void}
     */
    hideProgress() {
        $("#upload-progress-container").hide();
        $("#upload-progress").css("width", "0%");
    }

    /**
     * Handles successful upload completion.
     * Clears state and redirects to processing view.
     *
     * @returns {void}
     */
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
    
    /**
     * Extracts CSRF token from browser cookies.
     *
     * @returns {string}
     */
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
