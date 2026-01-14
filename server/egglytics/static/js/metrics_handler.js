document.addEventListener('DOMContentLoaded', () => {
    const modelSelect = document.getElementById("model-select");
    const container = document.getElementById("metrics-container");

    modelSelect.addEventListener("change", function() {
        const selectedOptions = Array.from(this.selectedOptions).map(opt => opt.value);

        if (selectedOptions.length === 0) {
            container.innerHTML = "<p>Select one or more models to view metrics.</p>";
            return;
        }

        const params = selectedOptions.map(m => "model=" + encodeURIComponent(m)).join("&");

        fetch(`/metric/ajax/?${params}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    container.innerHTML = `<p class="error">${data.error}</p>`;
                    return;
                }
                renderMetrics(data.comparison);
            })
            .catch(err => {
                console.error("Fetch error:", err);
                container.innerHTML = "<p>Error loading metrics.</p>";
            });
    });

    function renderMetrics(comparisonData) {
        container.innerHTML = comparisonData.map(r => `
            <div class="model-card">
                <h3>${r.model}</h3>
                
                <section>
                    <h4>Dataset Overview</h4>
                    <ul class="metrics-list">
                        <li><span>Total Images:</span> <strong>${r.total_images}</strong></li>
                        <li><span>Ground Truth:</span> <strong>${r.total_ground_truth}</strong></li>
                        <li><span>Predictions:</span> <strong>${r.total_model_predictions}</strong></li>
                    </ul>
                </section>

                <section>
                    <h4>Confusion Matrix</h4>
                    <div class="metric-grid">
                        <div class="metric-card-small tp">TP: ${r.TP}</div>
                        <div class="metric-card-small fp">FP: ${r.FP}</div>
                        <div class="metric-card-small fn">FN: ${r.FN}</div>
                    </div>
                </section>

                <section>
                    <h4>Performance</h4>
                    <ul class="metrics-list">
                        <li><span>Precision:</span> ${r.precision}</li>
                        <li><span>Recall:</span> ${r.recall}</li>
                        <li><span>F1 Score:</span> ${r.f1_score}</li>
                        <li><span>MAE:</span> ${r.MAE}</li>
                    </ul>
                </section>
            </div>
        `).join('');
    }
});