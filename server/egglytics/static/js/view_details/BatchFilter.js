export class BatchFilter {
    constructor(tableSelector, pagination, onFilter) {
        this.tableSelector = tableSelector;
        this.pagination = pagination;
        this.onFilter = onFilter;

        const inputIds = [
            "batchSearch", "ownerSearch", "dateFrom", "dateTo",
            "imagesMin", "imagesMax", "eggsMin", "eggsMax"
        ];
        inputIds.forEach(id => $(`#${id}`).on("input", () => this.apply()));
    }

    apply() {
        const batchQuery  = $("#batchSearch").val().toLowerCase();
        const ownerQuery  = $("#ownerSearch").val().toLowerCase();
        const dateFrom    = $("#dateFrom").val() ? new Date($("#dateFrom").val()) : null;
        const dateTo      = $("#dateTo").val()   ? new Date($("#dateTo").val())   : null;
        const imagesMin   = parseFloat($("#imagesMin").val()) || 0;
        const imagesMax   = parseFloat($("#imagesMax").val()) || Infinity;
        const eggsMin     = parseFloat($("#eggsMin").val())   || 0;
        const eggsMax     = parseFloat($("#eggsMax").val())   || Infinity;

        $(`${this.tableSelector} tbody tr`).each(function () {
            const cells      = this.children;
            const batchName  = cells[0].textContent.toLowerCase();
            const dateText   = cells[1].textContent.trim();
            const ownerName  = cells[2].textContent.toLowerCase();
            const totalImages = parseFloat(cells[3].textContent.trim()) || 0;
            const totalEggs  = parseFloat(cells[4].textContent.trim()) || 0;

            const parts   = dateText.split('/');
            const rowDate = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);

            const isMatch =
                batchName.includes(batchQuery) &&
                ownerName.includes(ownerQuery) &&
                (!dateFrom || rowDate >= dateFrom) &&
                (!dateTo   || rowDate <= dateTo) &&
                totalImages >= imagesMin && totalImages <= imagesMax &&
                totalEggs   >= eggsMin   && totalEggs   <= eggsMax;

            $(this).attr('data-filtered-out', isMatch ? 'false' : 'true');
        });

        this.pagination.reset();
        if (this.onFilter) this.onFilter();
    }
}