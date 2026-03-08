export class ImageCropper {
    constructor({ getFileArray, setFile }) {
        this.getFileArray = getFileArray;
        this.setFile = setFile;
        this.crop = { top: 7.5, bottom: 7.5, left: 7.5, right: 7.5 };
        this.index = null;
        this.dragging = null;
        this.container = null;
        this.modal = document.getElementById("cropModal");
        this.originalImage = null;
        this.hasChanges = false;

        this.initGlobalListeners();
    }
    /* ========================
       PUBLIC METHODS
    ======================== */

    open(imageSrc, index) {
        this.hasChanges = false;
        this.index = index;
        this.modal.style.display = "block";
        this.originalImage = imageSrc;

        setTimeout(() => this.loadImage(imageSrc), 100);
    }

    close() {
        if (this.hasChanges) {
            const userConfirmed = confirm(
                "You have unsaved changes. Do you want to save them?"
            );

            if (userConfirmed) {
                this.performSave();
            }
        }

        this.modal.style.display = "none";
        this.resetInterface();
    }

    resetImage() {
        this.hasChanges = false;
        const img = document.getElementById("cropImage");
        img.src = this.originalImage;

        this.resetBars();
    }

    performCrop() {
        const img = document.getElementById("cropImage");
        if (!img) return;

        this.showLoading("Cropping image...");

        setTimeout(() => {
            try {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                const w = img.naturalWidth;
                const h = img.naturalHeight;

                const cropX = (this.crop.left / 100) * w;
                const cropY = (this.crop.top / 100) * h;
                const cropW = w - ((this.crop.left + this.crop.right) / 100) * w;
                const cropH = h - ((this.crop.top + this.crop.bottom) / 100) * h;

                canvas.width = cropW;
                canvas.height = cropH;

                ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

                img.src = canvas.toDataURL("image/jpeg", 0.9);

                this.resetBars();
                this.hasChanges = true;
            } catch (err) {
                console.error("Error cropping image:", err);
                alert("Something went wrong while cropping.");
            } finally {
                this.hideLoading();
            }
        }, 100);
    }

    performSave() {
        const img = document.getElementById("cropImage");

        if (!img || this.index === null) {
            console.error("Cannot save: no image or index set.");
            return;
        }

        const dataUrl = img.src;
        if (!dataUrl.startsWith("data:image/")) {
            console.warn("Nothing to save: image not cropped or invalid.");
            return;
        }

        // Get current file array
        const fileArray = this.getFileArray();
        
        // Convert to File
        const newFile = this.dataURLtoFile(dataUrl, fileArray[this.index].name);
        
        // Update using setter
        this.setFile(this.index, newFile);

        // Update table row
        const row = document.querySelector(
            `#upload-table tbody tr[data-id="${this.index + 1}"]`
        );
        if (row) {
            const previewImg = row.querySelector("td img");
            if (previewImg) previewImg.src = URL.createObjectURL(newFile);

            const sizeCell = row.querySelectorAll("td")[2];
            if (sizeCell) sizeCell.textContent =
                (newFile.size / (1024 * 1024)).toFixed(2) + " MB";
        }

        this.hasChanges = false;
        this.close();
    }
    /* ========================
       INTERNAL METHODS
    ======================== */

    loadImage(imageSrc) {
        const img = document.getElementById("cropImage");
        img.src = imageSrc;
        img.onload = () => this.showCropper();
    }

    showCropper() {
        document.getElementById("uploadArea").style.display = "none";
        document.getElementById("cropperSection").style.display = "block";
        document.getElementById("resetBtn").style.display = "inline-block";
        document.getElementById("resetPhotoBtn").style.display = "inline-block";
        document.getElementById("cropBtn").style.display = "inline-block";
        document.getElementById("saveBtn").style.display = "inline-block";

        this.setupCropper();
    }

    resetInterface() {
        document.getElementById("uploadArea").style.display = "block";
        document.getElementById("cropperSection").style.display = "none";
        document.getElementById("resetBtn").style.display = "none";
        document.getElementById("resetPhotoBtn").style.display = "none";
        document.getElementById("cropBtn").style.display = "none";
        document.getElementById("saveBtn").style.display = "none";

        this.resetBars();
    }

    setupCropper() {
        this.container = document.getElementById("imageContainer");
        const bars = this.container.querySelectorAll(".bar");

        bars.forEach((bar) => {
            bar.onmousedown = (e) => this.startDrag(e);
        });

        document.onmousemove = (e) => this.drag(e);
        document.onmouseup = () => this.stopDrag();
    }

    startDrag(e) {
        this.dragging = e.target.dataset.type;
        e.target.classList.add("active");
        e.preventDefault();
    }

    drag(e) {
        if (!this.dragging || !this.container) return;

        const rect = this.container.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        switch (this.dragging) {
            case "top":
                this.crop.top = Math.max(0, Math.min(100 - this.crop.bottom - 5, y));
                break;
            case "bottom":
                this.crop.bottom = Math.max(0, Math.min(100 - this.crop.top - 5, 100 - y));
                break;
            case "left":
                this.crop.left = Math.max(0, Math.min(100 - this.crop.right - 5, x));
                break;
            case "right":
                this.crop.right = Math.max(0, Math.min(100 - this.crop.left - 5, 100 - x));
                break;
        }

        this.updateDisplay();
    }

    stopDrag() {
        if (!this.dragging) return;
        const activeBar = this.container.querySelector(".bar.active");
        if (activeBar) activeBar.classList.remove("active");
        this.dragging = null;
    }
    
    updateDisplay() {
        if (!this.container) return; // <-- early exit if container not ready
        const bars = this.container.querySelectorAll(".bar");
        const overlay = document.getElementById("cropOverlay");

        if (!overlay) return; // make sure overlay exists

        bars.forEach((bar) => {
            const type = bar.dataset.type;
            bar.style[type] = this.crop[type] + "%";
        });

        overlay.style.top = this.crop.top + "%";
        overlay.style.left = this.crop.left + "%";
        overlay.style.right = this.crop.right + "%";
        overlay.style.bottom = this.crop.bottom + "%";
    }


    resetBars() {
        this.crop = { top: 7.5, bottom: 7.5, left: 7.5, right: 7.5 };
        this.updateDisplay();
    }

    dataURLtoFile(dataUrl, filename) {
        const arr = dataUrl.split(",");
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) u8arr[n] = bstr.charCodeAt(n);
        return new File([u8arr], filename, { type: mime });
    }

    showLoading(message = "Loading...") {
        let loader = document.getElementById("loadingOverlay");
        if (!loader) {
            loader = document.createElement("div");
            loader.id = "loadingOverlay";
            loader.innerHTML = `
                <div class="loader-content">
                    <div class="spinner"></div>
                    <p>${message}</p>
                </div>`;
            document.body.appendChild(loader);
        }
        loader.style.display = "flex";
    }

    hideLoading() {
        const loader = document.getElementById("loadingOverlay");
        if (loader) loader.style.display = "none";
    }

    initGlobalListeners() {
        window.addEventListener("mousedown", (event) => {
            if (!this.dragging && event.target === this.modal) {
                this.close();
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && this.modal.style.display === "block") {
                this.close();
            }
        });
    }
}
