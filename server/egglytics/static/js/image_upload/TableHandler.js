export class TableHandler {
    constructor({ getFileArray, models, cropper, onDelete }) {
        this.getFileArray = getFileArray;
        this.models = models;
        this.cropper = cropper;
        this.onDelete = onDelete;
        this.tbody = document.querySelector("#upload-table tbody");
    }

    /* ========================
       PUBLIC METHODS
    ======================== */

    updateSubmitButtonVisibility() {
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

    populateTable() {
        const fileArray = this.getFileArray();
        this.tbody.innerHTML = ""; // Clear old rows

        fileArray.forEach((file, index) => {
            const row = this.createTableRow(file, index);
            this.tbody.appendChild(row);
        });

        this.updateSubmitButtonVisibility();
    }

    reindexRows() {
        const rows = this.tbody.querySelectorAll("tr");
        rows.forEach((row, newIndex) => {
            row.dataset.id = newIndex + 1;

            const editBtn = row.querySelector(".demo-btn.success");
            const deleteBtn = row.querySelector(".demo-btn.danger");

            if (editBtn) {
                editBtn.onclick = () => {
                    const img = row.querySelector("img");
                    this.cropper.open(img.src, newIndex);
                };
            }

            if (deleteBtn) {
                deleteBtn.onclick = () => {
                    this.showDeleteConfirmation(newIndex);
                };
            }
        });
    }

    updateRow(index, newFile) {
        const row = this.tbody.querySelector(`tr[data-id="${index + 1}"]`);
        if (!row) return;

        // Update preview image
        const previewImg = row.querySelector("td img");
        if (previewImg) {
            previewImg.src = URL.createObjectURL(newFile);
        }

        // Update file size
        const sizeCell = row.querySelectorAll("td")[2];
        if (sizeCell) {
            sizeCell.textContent = (newFile.size / (1024 * 1024)).toFixed(2) + " MB";
        }
    }

    clearTable() {
        this.tbody.innerHTML = "";
        this.updateSubmitButtonVisibility();
    }

    /* ========================
       PRIVATE METHODS
    ======================== */

    createTableRow(file, index) {
        const row = document.createElement("tr");
        row.dataset.id = index + 1;

        // Preview image
        row.appendChild(this.createImageCell(file));
        
        // File name
        row.appendChild(this.createNameCell(file));
        
        // File size
        row.appendChild(this.createSizeCell(file));
        
        // Micro/Macro toggle
        row.appendChild(this.createModeCell(file, index));
        
        // Edit button
        row.appendChild(this.createEditCell(index));
        
        // Model dropdown
        row.appendChild(this.createModelCell(index));
        
        // Delete button
        row.appendChild(this.createDeleteCell(index));

        return row;
    }

    createImageCell(file) {
        const imgCell = document.createElement("td");
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.alt = "preview";
        img.width = 60;
        imgCell.appendChild(img);
        return imgCell;
    }

    createNameCell(file) {
        const nameCell = document.createElement("td");
        const nameWrap = document.createElement("div");
        nameWrap.className = "filename";
        nameWrap.textContent = file.name;
        nameWrap.title = file.name;
        nameCell.appendChild(nameWrap);
        return nameCell;
    }

    createSizeCell(file) {
        const sizeCell = document.createElement("td");
        sizeCell.textContent = (file.size / (1024 * 1024)).toFixed(2) + " MB";
        return sizeCell;
    }

    createModeCell(file, index) {
        const modeCell = document.createElement("td");
        const isMacro = (file.size / (1024 * 1024)) >= 1;

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
        return modeCell;
    }

    createEditCell(index) {
        const editCell = document.createElement("td");
        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "demo-btn success";
        editBtn.textContent = "Edit";
        
        editBtn.onclick = () => {
            const row = this.tbody.querySelector(`tr[data-id="${index + 1}"]`);
            const img = row.querySelector("img");
            this.cropper.open(img.src, index);
        };
        
        editCell.appendChild(editBtn);
        return editCell;
    }

    createModelCell(index) {
        const modelCell = document.createElement("td");
        const modelSelect = document.createElement("select");
        modelSelect.className = "limited-width-select";
        modelSelect.name = `model${index}`;
        modelSelect.setAttribute("data-row-model", "true");

        this.models.forEach((model) => {
            const option = document.createElement("option");
            option.value = model.value;
            option.textContent = model.label;

            if (model.value === "polyegg_heatmap") {
                option.selected = true;
            }

            modelSelect.appendChild(option);
        });

        modelCell.appendChild(modelSelect);
        return modelCell;
    }

    createDeleteCell(index) {
        const deleteCell = document.createElement("td");
        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "demo-btn danger";
        deleteBtn.textContent = "X";
        
        deleteBtn.onclick = () => {
            this.showDeleteConfirmation(index);
        };
        
        deleteCell.appendChild(deleteBtn);
        return deleteCell;
    }

    showDeleteConfirmation(index) {
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
            this.onDelete(index);
            confirmModal.remove();
        });

        cancelBtn.addEventListener("click", () => {
            confirmModal.remove();
        });
    }
}
