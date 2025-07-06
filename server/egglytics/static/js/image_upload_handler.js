$(document).ready(function () {
    const $dropArea = $('#drop-area');
    const $fileInput = $('#myfile');
    const $previewContainer = $('#uploaded-image');

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

    // File picker
    $fileInput.on('change', function () {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        // SECTION =========== CONSTANTS =========== 
        // Maximum file count
        const MAX_FILES = 15;
        // Maximum file size
        const MAX_SIZE_PER_FILE = 20 * 1024 * 1024;

        // SECTION =========== CHECKS THE UPLOAD =========== 
        
        const fileArray = Array.from(files);

        // Check if the total uploaded files exceeds max files.
        // In this case, just cancel file upload as it can be confusing to the user if I just upload N files ignoring others.
        if (fileArray.length > MAX_FILES) {
            alert(`You can only upload up to ${MAX_FILES} images.`);
            return;
        }

        // Check and append files that are:
        // (1) JPEG or PNG
        // (2) Is below the maximum file size  
        const validFiles = fileArray.filter(file => {
            if (!file.type.startsWith('image/')) {
                alert(`File "${file.name}" is not a valid image.`);
                return false;
            }
            if (file.size > MAX_SIZE_PER_FILE) {
                alert(`File "${file.name}" exceeds 1MB size limit.`);
                return false;
            }
            return true;
        });

        // Error handling for a rare case.
        if (validFiles.length === 0) {
            print("Case: Empty upload");
            return;
        }

        // SECTION ===========  JS SENDS THE IMAGE TO THE SERVER =========== 
        const formData = new FormData();

        validFiles.forEach(file => {
                const reader = new FileReader();
                reader.onload = function (e) {
                    const $img = $('<img>', {
                        src: e.target.result,
                        css: {
                            'max-width': '100%',
                            'margin-top': '10px'
                        }
                    });
                    $previewContainer.append($img);
                };
                reader.readAsDataURL(file);              
                  // Append to FormData using key "myfiles"
                formData.append('myfiles', file);
        })

        // Send to server
        $.ajax({
            url: '',  // send to current page (same as your view)
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            headers: {
                'X-CSRFToken': getCSRFToken()
            },
            success: function (response) {
                console.log('Uploaded files:', response.filenames);
            },
            error: function (xhr, status, error) {
                console.error('Upload failed:', error);
            }
        });
    }

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
