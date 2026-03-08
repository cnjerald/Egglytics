export class Pagination {
    constructor(tableSelector, pageInfoId, prevBtnId, nextBtnId, rowsSelectId) {
        this.tableSelector = tableSelector;
        this.$pageInfo = $(`#${pageInfoId}`);
        this.$prevBtn = $(`#${prevBtnId}`);
        this.$nextBtn = $(`#${nextBtnId}`);
        this.currentPage = 1;
        this.rowsPerPage = 5;

        $(`#${rowsSelectId}`).on("change", (e) => {
            this.rowsPerPage = parseInt(e.target.value, 10);
            this.currentPage = 1;
            this.render();
        });

        this.$prevBtn.on("click", () => { this.currentPage--; this.render(); });
        this.$nextBtn.on("click", () => { this.currentPage++; this.render(); });
    }

    render() {
        const allRows = $(`${this.tableSelector} tbody tr`).toArray();
        const visibleRows = allRows.filter(r => $(r).attr('data-filtered-out') !== 'true');
        const totalPages = Math.ceil(visibleRows.length / this.rowsPerPage) || 1;

        if (this.currentPage < 1) this.currentPage = 1;
        if (this.currentPage > totalPages) this.currentPage = totalPages;

        $(allRows).hide();

        const start = (this.currentPage - 1) * this.rowsPerPage;
        visibleRows.slice(start, start + this.rowsPerPage).forEach(r => $(r).show());

        this.$pageInfo.text(`Page ${this.currentPage} of ${totalPages}`);
        this.$prevBtn.prop("disabled", this.currentPage === 1);
        this.$nextBtn.prop("disabled", this.currentPage === totalPages);
    }

    reset() {
        this.currentPage = 1;
        this.render();
    }
}