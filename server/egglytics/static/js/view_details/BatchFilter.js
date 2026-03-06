/**
 * -----------------------------------------
 * BATCH FILTER
 * -----------------------------------------
 * Filters batch table rows based on multiple
 * criteria such as batch name, owner, date range,
 * number of images, and egg counts.
 */

export class BatchFilter {
    /**
     * @param {string} tableSelector - jQuery selector for the table to filter.
     * @param {Object} pagination - Pagination object with a reset() method.
     * @param {Function} onFilter - Optional callback invoked after filtering.
     */
    constructor(tableSelector, pagination, onFilter) {
        /**
         * Selector for the table.
         * @type {string}
         */
        this.tableSelector = tableSelector;
        /**
         * Pagination controller.
         * @type {Object}
         */
        this.pagination = pagination;

        /**
         * Callback to run after filtering.
         * @type {Function|null}
         */
        this.onFilter = onFilter;

        const inputIds = [
            "batchSearch", "ownerSearch", "dateFrom", "dateTo",
            "imagesMin", "imagesMax", "eggsMin", "eggsMax"
        ];
        inputIds.forEach(id => $(`#${id}`).on("input", () => this.apply()));
    }
    
    /**
     * Apply filters to all table rows based on user input.
     * Sets a 'data-filtered-out' attribute on each row
     * indicating whether it matches the filter criteria.
     */
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