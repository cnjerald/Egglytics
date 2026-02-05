// ui.js - UI management and rendering

import { panToImageCoordinates } from './viewer.js';

export class UIManager {
    constructor(listEl, modeEl, eggCountEl) {
        this.listEl = listEl;
        this.modeEl = modeEl;
        this.eggCountEl = eggCountEl;
        this.renderedCount = 0;
        this.pageSize = 50;
    }

    setMode(mode) {
        this.modeEl.textContent = mode;

        if (mode === "Point") {
            this.modeEl.style.color = "#6cff6c";
        } else if (mode === "Rectangle") {
            this.modeEl.style.color = "#ff6b6b";
        } else {
            this.modeEl.style.color = "#ccc";
        }
    }

    setEggCount(count) {
        this.eggCountEl.innerHTML = "Egg Count: " + count;
    }

    clearList() {
        this.listEl.innerHTML = "";
        this.renderedCount = 0;
    }





}