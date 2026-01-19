document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById("metrics-container");
    const template = document.getElementById("model-card-template");
    const checkboxGroup = document.getElementById("model-checkbox-group");
    const ajaxUrl = container.dataset.url;

    // Listen for any change within the checkbox group
    checkboxGroup.addEventListener("change", function() {
        // Find all checkboxes that are currently checked
        const checkedBoxes = Array.from(document.querySelectorAll(".js-model-checkbox:checked"));
        const selectedOptions = checkedBoxes.map(cb => cb.value);

        if (selectedOptions.length === 0) {
            container.innerHTML = '<p class="placeholder">Select a model to begin.</p>';
            return;
        }

        if (checkedBoxes.length > 8) {
            alert("You can only select up to 8 models for comparison.");
            // Uncheck the last one clicked
            e.target.checked = false; 
            return;
        }

        const params = selectedOptions.map(m => "model=" + encodeURIComponent(m)).join("&");

        fetch(`${ajaxUrl}?${params}`)
            .then(res => res.json())
            .then(data => {
                container.innerHTML = ""; 
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