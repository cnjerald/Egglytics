//**This is the upload page (Also the index page) */

/**
 * @fileoverview Entry point for the image upload page.
 * Manages file uploads, image cropping, table rendering, and form submission.
 *
 * @module index
 */

import { ModelConfig } from "./image_upload/ModelConfig.js";
import { ImageCropper } from "./image_upload/ImageCropper.js";
import { TableHandler } from "./image_upload/TableHandler.js";
import { UploadHandler } from "./image_upload/UploadHandler.js";

/**
 * Global array storing all staged file objects awaiting upload.
 * @type {File[]}
 */
let fileArray = [];

/**
 * Handles image cropping interactions, including saving and resetting crops.
 * @type {ImageCropper}
 */
const cropper = new ImageCropper({
    getFileArray: () => fileArray,
    /**
     * Updates a file at the given index and refreshes its table row.
     * @param {number} index - The index of the file to update.
     * @param {File} file - The new file object to store.
     */
    setFile: (index, file) => { 
        fileArray[index] = file;
        tableHandler.updateRow(index, file);
    }
});

/**
 * Manages rendering and interaction of the file table rows.
 * @type {TableHandler}
 */
const tableHandler = new TableHandler({
    getFileArray: () => fileArray,
    models: ModelConfig.getAll(),
    cropper: cropper,
    /**
     * Callback invoked when a file row is deleted.
     * @param {number} index - The index of the file to delete.
     */
    onDelete: (index) => uploadHandler.deleteFile(index)
});

/**
 * Manages file intake, validation, and submission to the server.
 * @type {UploadHandler}
 */
const uploadHandler = new UploadHandler({
    getFileArray: () => fileArray,
    /**
     * Replaces the entire file array with a new one.
     * @param {File[]} newArray - The replacement file array.
     */
    setFileArray: (newArray) => { fileArray = newArray; },
    tableHandler: tableHandler
});


$(document).ready(function () {
    initializeUI();
    setupFileInputHandlers();
    setupCropperButtons();
    setupGlobalControls();
    setupUploadButton();
});

/**
 * Initializes the page UI on load.
 * Populates the model dropdown, sets a default batch name,
 * loads the saved owner username, and updates button visibility.
 *
 * @returns {void}
 */
function initializeUI() {
    loadModels();
    setDefaultBatchName();
    loadOwner();
    tableHandler.updateSubmitButtonVisibility();
}

/**
 * Populates the model dropdown (`#all_model`) with all available models
 * retrieved from {@link ModelConfig}.
 *
 * @returns {void}
 */
function loadModels() {
    const $allModel = $("#all_model").empty();
    const models = ModelConfig.getAll();
    
    models.forEach(model => {
        $allModel.append(
            $("<option>", {
                value: model.value,
                text: model.label
            })
        );
    });
}

/**
 * Sets the default batch name in the `#batch_name` input field.
 * The value is a timestamp string formatted as `YYYYMMDD_HHmmss_mmm`.
 *
 * @returns {void}
 */
function setDefaultBatchName() {
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
}

/**
 * Loads the saved username from `localStorage` and pre-fills
 * the `#user_name` input field if a value is found.
 *
 * @returns {void}
 */
function loadOwner() {
    const savedUser = localStorage.getItem("username");
    if (savedUser) {
        $("#user_name").val(savedUser);
    }
}

/**
 * Registers event handlers for file input interactions,
 * including drag-and-drop onto `#drop-area` and file picker via `#myfile`.
 *
 * Drag styling is applied via the `highlight` CSS class while
 * files are dragged over the drop area.
 *
 * @returns {void}
 */
function setupFileInputHandlers() {
    const $dropArea = $('#drop-area');
    const $fileInput = $('#myfile');

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
        uploadHandler.handleFiles(files);
    });

    // File picker
    $fileInput.on('change', function () {
        uploadHandler.handleFiles(this.files);
    });

    // ↓ Previously inline onclick handlers
    $("#select-file-btn").on("click", function () {
        $fileInput.click();
    });

    $(".close-btn").on("click", function () {
        cropper.close();
    });
}

/**
 * Registers click handlers for the image cropper modal buttons:
 * - `#saveBtn` — saves the current crop
 * - `#cropBtn` — applies the crop selection
 * - `#resetBtn` — resets crop bars to default positions
 * - `#resetPhotoBtn` — reverts the image to its original state
 * - `.close-modal` — closes the cropper modal
 *
 * @returns {void}
 */
function setupCropperButtons() {
    $("#saveBtn").on("click", () => cropper.performSave());
    $("#cropBtn").on("click", () => cropper.performCrop());
    $("#resetBtn").on("click", () => cropper.resetBars());
    $("#resetPhotoBtn").on("click", () => cropper.resetImage());
    $(".close-modal").on("click", () => cropper.close());
        $("#selectFileBtn").on("click", function () {
        $("#myfile").trigger("click");
    });
}

/**
 * Registers event handlers for global table controls that apply
 * changes across all file rows simultaneously.
 *
 * Handles:
 * - `#all_mode_toggle` checkbox — syncs all `.mode-toggle` checkboxes
 * - `.mode-toggle` checkboxes — deselects the global toggle when any row is changed individually
 * - `#all_model` dropdown — applies the selected model to all per-row model dropdowns
 * - `#all_micro` / `#all_macro` radio buttons — legacy handlers for micro/macro mode selection
 *
 * @returns {void}
 */
function setupGlobalControls() {
    $(document).on("change", "#all_mode_toggle", function () {
        const isChecked = $(this).is(":checked");
        $(".mode-toggle").prop("checked", isChecked);
    });

    $(document).on("change", ".mode-toggle", function () {
        $("#all_mode_toggle").prop("checked", false);
    });

    $("#all_model").on("change", function() {
        const newValue = $(this).val();
        $('select[data-row-model="true"]').val(newValue);
    });

    $("#all_micro").on("change", function () {
        if ($(this).is(":checked")) {
            $('input[type="radio"][value="micro"]').not("#all_micro").prop("checked", true);
        }
    });

    $("#all_macro").on("change", function () {
        if ($(this).is(":checked")) {
            $('input[type="radio"][value="macro"]').not("#all_macro").prop("checked", true);
        }
    });
 
}

/**
 * Registers the click handler for the `#upload-btn` button.
 * Prevents default form submission and delegates to {@link UploadHandler#submitUpload}.
 *
 * @returns {void}
 */
function setupUploadButton() {
    $("#upload-btn").on("click", function (e) {
        e.preventDefault();
        uploadHandler.submitUpload();
    });
}