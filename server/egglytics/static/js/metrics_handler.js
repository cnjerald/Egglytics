$(document).ready(function () {
    const $container = $("#metrics-container");
    const ajaxUrl = $container.data("url");

    $("#model-checkbox-group").on("change", function (e) {
        const $checkedBoxes = $(".js-model-checkbox:checked");
        const selectedOptions = $checkedBoxes.map(function () {
            return $(this).val();
        }).get();

        if (selectedOptions.length === 0) {
            $container.html('<p class="placeholder">Select a model to begin.</p>');
            return;
        }

        if ($checkedBoxes.length > 8) {
            alert("You can only select up to 8 models for comparison.");
            $(e.target).prop("checked", false);
            return;
        }

        const params = selectedOptions.map(m => "model=" + encodeURIComponent(m)).join("&");

        $.get(`${ajaxUrl}?${params}`)
            .done(function (html) {
                $container.html(html);
            })
            .fail(function (err) {
                console.error("Error fetching metrics:", err);
            });
    });
});