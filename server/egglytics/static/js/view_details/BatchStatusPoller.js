import { Utils } from "./Utils.js";

export class BatchStatusPoller {
    constructor(onUpdate) {
        this.onUpdate = onUpdate;
        this.poller   = null;
    }

    start() {
        this.update();
        this.poller = setInterval(() => this.update(), 5000);
    }

    stop() {
        clearInterval(this.poller);
    }

    update() {
        fetch('/batch/status/')
            .then(res => res.json())
            .then(batches => {
                if (!batches || batches.length === 0) {
                    $("#notice-box").html("<h5>No batches found</h5>").show();
                    return;
                }

                batches.forEach(batch => {
                    const row = document.querySelector(`#batchTable tbody tr[data-batch-id="${batch.id}"]`);
                    if (!row) return;

                    row.children[4].textContent = batch.total_eggs;
                    const statusCell = row.children[5];

                    if (batch.is_complete && !batch.has_fail_present) {
                        statusCell.innerHTML = '<i class="fas fa-check-circle" style="color:green;"></i>';
                        if (Utils.getFlag()?.processingActive) {
                            $("#notice-box").html("<h5>Processing Complete! All images processed successfully.</h5>").show();
                        }
                        localStorage.removeItem("flag");

                    } else if (batch.is_complete) {
                        statusCell.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:red;"></i>';
                        if (Utils.getFlag()?.processingActive) {
                            $("#notice-box").html("<h5>Processing Complete! Some images failed.</h5>").show();
                        }
                        localStorage.removeItem("flag");

                    } else if (batch.has_fail_present) {
                        statusCell.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:orange;"></i>';
                        if (Utils.getFlag()?.processingActive) {
                            $("#notice-box").html("<h5>Processing Ongoing! Some images failed.</h5>").show();
                        }
                        localStorage.removeItem("flag");

                    } else {
                        statusCell.innerHTML = '<i class="fas fa-spinner fa-spin" style="color:orange;"></i>';
                        $("#notice-box").html(`
                            <h5>Your images are being processed. Results update every 5 seconds.<br>
                            Processing Status: <i class='fas fa-spinner fa-spin' style='color:orange;'></i></h5>
                        `).show();
                    }
                });

                if (this.onUpdate) this.onUpdate();
            })
            .catch(err => console.error(err));
    }
}