import { Utils } from "./view_details/Utils.js";
import { Pagination } from "./view_details/Pagination.js";
import { BatchFilter } from "./view_details/BatchFilter.js";
import { TableSorter } from "./view_details/TableSorter.js";
import { BatchStatusPoller } from "./view_details/BatchStatusPoller.js";
import { BatchPopup } from "./view_details/BatchPopup.js";
import { ContextMenu } from "./view_details/ContextMenu.js";
import { BatchContextMenu } from "./view_details/BatchContextMenu.js";
import { ImageContextMenu } from "./view_details/ImageContextMenu.js";
import { HeaderTotals } from "./view_details/HeaderTotals.js";
import { BatchDelete } from "./view_details/BatchDelete.js";


$(document).ready(function () {
    // -- Totals
    const headerTotals = new HeaderTotals();
    const recalcTotals = () => headerTotals.recalc();

    // -- Pagination
    const pagination = new Pagination("#batchTable", "pageInfo", "prevPage", "nextPage", "rowsPerPageSelect");
    pagination.render();

    // -- Filter
    new BatchFilter("#batchTable", pagination, recalcTotals);

    // -- Sorter
    new TableSorter("#batchTable");

    // -- Popup
    const popup = new BatchPopup(recalcTotals);

    // -- Context Menus
    new BatchContextMenu(recalcTotals);
    new ImageContextMenu(popup);

    // -- Batch Delete (main table)
    new BatchDelete(recalcTotals);

    // -- Status Poller
    const poller = new BatchStatusPoller(recalcTotals);

    // -- Notice box
    $("#notice-box").hide();
    const flag = Utils.getFlag();
    if (flag?.processingActive) {
        $("#notice-box").html(`
            <h5>Your images are being processed. Results update every 5 seconds.<br>
            Processing Status: <i class="fas fa-spinner fa-spin" style="color:orange;"></i></h5>
        `).show();
    }

    poller.start();
    recalcTotals();
});