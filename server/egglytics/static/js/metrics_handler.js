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
            .then(res => res.text())
            .then(html => {
                container.innerHTML = html;
            })
            .catch(err => console.error("Error fetching metrics:", err));
    });
});