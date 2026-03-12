/**
 * -----------------------------------------
 * HEADER TOTALS MANAGER
 * -----------------------------------------
 * Calculates and updates the total number of images and eggs
 * displayed in the batch table header.
 */

export class HeaderTotals {
    /**
     * Recalculates totals for visible rows in the batch table
     * and updates the corresponding header elements.
     */
    recalc() {
        let totalImages = 0;
        let totalEggs   = 0;

        $("#batchTable tbody tr").each(function () {
            if ($(this).css("display") !== "none") {
                totalImages += parseInt(this.children[3].innerText, 10) || 0;
                totalEggs   += parseInt(this.children[4].innerText, 10) || 0;
            }
        });

        $("#total-images-header").text(`Total Images: ${totalImages}`);
        $("#total-eggs-header").text(`Total Eggs: ${totalEggs}`);
    }
}