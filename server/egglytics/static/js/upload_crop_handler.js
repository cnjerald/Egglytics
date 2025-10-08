let crop = { top: 20, bottom: 20, left: 20, right: 20 };
let index = null;
let dragging = null;
let container = null;
const modal = document.getElementById("cropModal");
let original_image = null;

function openCropperWithImage(imageSrc,index) {
    index = index;
    modal.style.display = "block";
    original_image = imageSrc;
    // small delay to ensure modal is visible before loading
    setTimeout(() => loadImage(imageSrc), 100);
}

function loadImage(imageSrc) {
    const img = document.getElementById('cropImage');
    img.src = imageSrc;

    img.onload = function () {
        showCropper();
    };
}

function resetImage(){
    const img = document.getElementById('cropImage');
    // Replace the original image with the original one
    img.src = original_image;
    
    // Reset crop values to show full cropped image
    crop = { top: 20, bottom: 20, left: 20, right: 20 };
    updateDisplay();
}

function closeCropper() {
    modal.style.display = "none";
    resetInterface();
}

function resetInterface() {
    document.getElementById('uploadArea').style.display = 'block';
    document.getElementById('cropperSection').style.display = 'none';
    document.getElementById('resetBtn').style.display = 'none';
    document.getElementById('resetPhotoBtn').style.display = 'none';
    document.getElementById('cropBtn').style.display = 'none';
    document.getElementById('saveBtn').style.display = 'none';
    crop = { top: 20, bottom: 20, left: 20, right: 20 };
}

function showCropper() {
    document.getElementById('uploadArea').style.display = 'none';
    document.getElementById('cropperSection').style.display = 'block';
    document.getElementById('resetBtn').style.display = 'inline-block';
    document.getElementById('resetPhotoBtn').style.display = 'inline-block';
    document.getElementById('cropBtn').style.display = 'inline-block';
    document.getElementById('saveBtn').style.display = 'inline-block';
    setupCropper();
}

function dataURLtoFile(dataUrl, filename) {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}


function setupCropper() {
    container = document.getElementById('imageContainer');
    const bars = container.querySelectorAll('.bar');
    
    bars.forEach(bar => {
        bar.onmousedown = startDrag;
    });

    document.onmousemove = drag;
    document.onmouseup = stopDrag;

}

function startDrag(e) {
    dragging = e.target.dataset.type;
    e.target.classList.add('active');
    e.preventDefault();
}

function drag(e) {
    if (!dragging || !container) return;

    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    switch (dragging) {
        case 'top':
            crop.top = Math.max(0, Math.min(100 - crop.bottom - 5, y));
            break;
        case 'bottom':
            crop.bottom = Math.max(0, Math.min(100 - crop.top - 5, 100 - y));
            break;
        case 'left':
            crop.left = Math.max(0, Math.min(100 - crop.right - 5, x));
            break;
        case 'right':
            crop.right = Math.max(0, Math.min(100 - crop.left - 5, 100 - x));
            break;
    }

    updateDisplay();
}

function stopDrag() {
    if (dragging) {
        const activeBar = container.querySelector('.bar.active');
        if (activeBar) activeBar.classList.remove('active');
        dragging = null;
    }
}

function updateDisplay() {
    const bars = container.querySelectorAll('.bar');
    const overlay = document.getElementById('cropOverlay');

    bars.forEach(bar => {
        const type = bar.dataset.type;
        switch (type) {
            case 'top':
                bar.style.top = crop.top + '%';
                break;
            case 'bottom':
                bar.style.bottom = crop.bottom + '%';
                break;
            case 'left':
                bar.style.left = crop.left + '%';
                break;
            case 'right':
                bar.style.right = crop.right + '%';
                break;
        }
    });
    
    // 🔹 Update the highlight overlay box
    overlay.style.top = crop.top + "%";
    overlay.style.left = crop.left + "%";
    overlay.style.right = crop.right + "%";
    overlay.style.bottom = crop.bottom + "%";
}

function resetBars() {
    crop = { top: 20, bottom: 20, left: 20, right: 20 };
    updateDisplay();
}

function performCrop() {
    const img = document.getElementById('cropImage');

    // Create an off-screen canvas instead of using a <canvas> element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const w = img.naturalWidth;
    const h = img.naturalHeight;

    const cropX = (crop.left / 100) * w;
    const cropY = (crop.top / 100) * h;
    const cropW = w - ((crop.left + crop.right) / 100) * w;
    const cropH = h - ((crop.top + crop.bottom) / 100) * h;

    canvas.width = cropW;
    canvas.height = cropH;

    // Draw cropped area
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    // Replace the original image with cropped result
    img.src = canvas.toDataURL();

    crop = { top: 20, bottom: 20, left: 20, right: 20 };
    updateDisplay();
}


// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('cropModal');
    if (event.target === modal) {
        closeCropper();
    }
}

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('cropModal');
        if (modal.style.display === 'block') {
            closeCropper();
        }
    }
});