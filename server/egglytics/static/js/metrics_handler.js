document.addEventListener('DOMContentLoaded', () => {
    const modelSelect = document.getElementById("model-select");
    const container = document.getElementById("metrics-container");
    const template = document.getElementById("model-card-template");

    modelSelect.addEventListener("change", function() {
        const selectedOptions = Array.from(this.selectedOptions).map(opt => opt.value);
        if (selectedOptions.length === 0) {
            container.innerHTML = '<p class="placeholder">Select a model to begin.</p>';
            return;
        }

        const params = selectedOptions.map(m => "model=" + encodeURIComponent(m)).join("&");

        fetch(`/metric/ajax/?${params}`)
            .then(res => res.json())
            .then(data => {
                container.innerHTML = ""; // Clear current cards
                data.comparison.forEach(r => {
                    const clone = template.content.cloneNode(true);
                    
                    clone.querySelector(".js-model-name").textContent = r.model;
                    clone.querySelector(".js-images").textContent = r.total_images;
                    clone.querySelector(".js-preds").textContent = r.total_model_predictions;
                    clone.querySelector(".js-tp").textContent = `TP: ${r.TP}`;
                    clone.querySelector(".js-fp").textContent = `FP: ${r.FP}`;
                    clone.querySelector(".js-fn").textContent = `FN: ${r.FN}`;
                    clone.querySelector(".js-precision").textContent = r.precision;
                    clone.querySelector(".js-recall").textContent = r.recall;

                    container.appendChild(clone);
                });
            });
    });
});