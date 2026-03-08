import { ModelConfig } from "./image_upload/ModelConfig.js";
import { ImageCropper } from "./image_upload/ImageCropper.js";
import { TableHandler } from "./image_upload/TableHandler.js";
import { UploadHandler } from "./image_upload/UploadHandler.js";

// Global state
let fileArray = [];

// Initialize cropper
const cropper = new ImageCropper({
    getFileArray: () => fileArray,
    setFile: (index, file) => { 
        fileArray[index] = file;
        tableHandler.updateRow(index, file);
    }
});

// Initialize table handler
const tableHandler = new TableHandler({
    getFileArray: () => fileArray,
    models: ModelConfig.getAll(),
    cropper: cropper,
    onDelete: (index) => uploadHandler.deleteFile(index)
});

// Initialize upload handler
const uploadHandler = new UploadHandler({
    getFileArray: () => fileArray,
    setFileArray: (newArray) => { fileArray = newArray; },
    tableHandler: tableHandler
});

$(document).ready(function () {
    // Initialize UI
    initializeUI();
    
    // Setup file input handlers
    setupFileInputHandlers();
    
    // Setup cropper button handlers
    setupCropperButtons();
    
    // Setup global controls
    setupGlobalControls();
    
    // Setup upload button
    setupUploadButton();
});

/* ========================
   INITIALIZATION
======================== */

function initializeUI() {
    // Load models into dropdown
    loadModels();
    
    // Set default batch name
    setDefaultBatchName();
    
    // Load saved username
    loadSavedUsername();
    
    // Update button visibility
    tableHandler.updateSubmitButtonVisibility();
}

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

function loadSavedUsername() {
    const savedUser = localStorage.getItem("username");
    if (savedUser) {
        $("#user_name").val(savedUser);
    }
}

/* ========================
   FILE INPUT HANDLERS
======================== */

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
}

/* ========================
   CROPPER BUTTON HANDLERS
======================== */

function setupCropperButtons() {
    $("#saveBtn").on("click", () => {
        cropper.performSave();
    });

    $("#cropBtn").on("click", () => {
        cropper.performCrop();
    });

    $("#resetBtn").on("click", () => {
        cropper.resetBars();
    });

    $("#resetPhotoBtn").on("click", () => {
        cropper.resetImage();
    });

    $(".close-modal").on("click", () => {
        cropper.close();
    });
}

/* ========================
   GLOBAL CONTROLS
======================== */

function setupGlobalControls() {
    // Global mode toggle
    $(document).on("change", "#all_mode_toggle", function () {
        const isChecked = $(this).is(":checked");
        $(".mode-toggle").prop("checked", isChecked);
    });

    // Individual mode toggle deselects global
    $(document).on("change", ".mode-toggle", function () {
        $("#all_mode_toggle").prop("checked", false);
    });

    // Global model selector
    $("#all_model").on("change", function() {
        const newValue = $(this).val();
        $('select[data-row-model="true"]').val(newValue);
    });

    // Legacy radio button handlers (if still needed)
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

/* ========================
   UPLOAD BUTTON
======================== */

function setupUploadButton() {
    $("#upload-btn").on("click", function (e) {
        e.preventDefault();
        uploadHandler.submitUpload();
    });
}
