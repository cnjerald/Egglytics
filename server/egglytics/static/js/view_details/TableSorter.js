export class TableSorter {
    constructor(tableSelector) {
        // Batch table - direct header clicks
        $(`${tableSelector} th`).each(function (index) {
            let ascending = true;
            $(this).on("click", function () {
                const $tbody = $(this).closest("table").find("tbody");
                const rows = $tbody.find("tr").toArray();

                rows.sort((a, b) => {
                    let cellA = a.children[index].textContent.trim();
                    let cellB = b.children[index].textContent.trim();
                    const numA = parseFloat(cellA.replace(/,/g, ""));
                    const numB = parseFloat(cellB.replace(/,/g, ""));
                    if (!isNaN(numA) && !isNaN(numB)) { cellA = numA; cellB = numB; }
                    if (cellA < cellB) return ascending ? -1 : 1;
                    if (cellA > cellB) return ascending ? 1 : -1;
                    return 0;
                });

                rows.forEach(r => $tbody.append(r));
                ascending = !ascending;
            });
        });

        // Popup table - delegated TH click
        $(document).on("click", "th", function () {
            const $th    = $(this);
            const $table = $th.closest("table");
            const $tbody = $table.find("tbody");
            if (!$tbody.length) return;

            const column    = this.cellIndex;
            const ascending = !$th.hasClass("asc");

            $table.find("th").removeClass("asc desc");
            $th.addClass(ascending ? "asc" : "desc");

            const rows = $tbody.find("tr").toArray();
            rows.sort((a, b) => {
                const valA = a.children[column].textContent.trim();
                const valB = b.children[column].textContent.trim();
                const numA = parseFloat(valA);
                const numB = parseFloat(valB);
                if (!isNaN(numA) && !isNaN(numB)) return ascending ? numA - numB : numB - numA;
                return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
            });

            rows.forEach(r => $tbody.append(r));
        });
    }
}