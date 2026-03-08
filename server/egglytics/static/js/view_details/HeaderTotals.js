export class HeaderTotals {
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