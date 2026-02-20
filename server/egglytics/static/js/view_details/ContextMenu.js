export class ContextMenu {
    constructor(menuId, triggerSelector) {
        this.$menu       = $(`#${menuId}`);
        this.targetRow   = null;
        this.targetId    = null;

        // Show on right-click
        $(document).on("contextmenu", triggerSelector, (e) => {
            const row = $(e.target).closest("tr")[0];
            if (!row) return;
            e.preventDefault();

            this.targetRow = row;
            this.targetId  = this._resolveId(row);

            this.$menu.css({ display: "block", left: e.clientX, top: e.clientY });
        });

        // Hide on any click
        $(document).on("click", () => this.$menu.hide());

        // Hover effect
        this.$menu.find("li")
            .on("mouseover", (e) => $(e.currentTarget).css("background-color", "#f1f1f1"))
            .on("mouseout",  (e) => $(e.currentTarget).css("background-color", "transparent"));
    }

    // Override in subclass to resolve target id from row
    _resolveId(row) {
        return $(row).attr("data-batch-id") || $(row).attr("data-image-id");
    }
}