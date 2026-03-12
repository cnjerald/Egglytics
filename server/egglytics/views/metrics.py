#
#
#
#
# FUNCTIONS INVOLVING THE METRICS PAGES AND VIEWS
#
#
#
#

from ._imports import *

def metric(request):
    """
    Render the metrics comparison page.

    Fetches all distinct model names and computes stats for any models
    selected via query params. Supports side-by-side comparison of
    multiple models.

    Args:
        request: GET request with query params:
            - model (list[str]): One or more model names to compare

    Returns:
        Rendered response with template "metric.html" and context:
            - models (QuerySet): All distinct model_used values
            - selected_models (list[str]): Models chosen by the user
            - comparison (list[dict]): Stats dict per selected model (see get_model_stats)
    """

    models = ImageDetails.objects.values_list("model_used", flat=True).distinct()
    selected_models = request.GET.getlist("model")

    comparison = [get_model_stats(m) for m in selected_models]

    context = {
        "included_template": "metric.html",
        "models": models,
        "selected_models": selected_models,
        "comparison": comparison,
    }
    return render(request, "base.html", context)

def get_model_stats(model_name):
    """
    Compute detection and counting metrics for a single model.

    Uses validated images only. Annotation points are interpreted as:
        - TP: original points kept by the reviewer (is_original=True, is_deleted=False)
        - FP: original points deleted by the reviewer (is_original=True, is_deleted=True)
        - FN: points added by the reviewer (is_original=False)

    Args:
        model_name (str): The model_used value to filter ImageDetails by

    Returns:
        dict: {
            "model"                  (str):   Model name,
            "total_images"           (int):   Number of validated images,
            "count_accuracy"         (float): % accuracy of predicted vs true egg count,
            "total_ground_truth"     (int):   TP + FN,
            "total_model_predictions"(int):   TP + FP,
            "TP"                     (int),
            "FP"                     (int),
            "FN"                     (int),
            "precision"              (float): Rounded to 4 decimal places,
            "recall"                 (float): Rounded to 4 decimal places,
            "f1_score"               (float): Rounded to 4 decimal places,
            "MAE"                    (float): Mean absolute error per image, rounded to 4,
        }

    Notes:
        - Images where the true count is 0 are excluded from MAE calculation
        - All metrics default to 0 when denominators are zero
    """
    validated_images = ImageDetails.objects.filter(
        is_validated=True,
        model_used=model_name
    )

    total_images = validated_images.count()

    # Point-level classification
    TP = AnnotationPoints.objects.filter(
        image_id__in=validated_images,
        is_original=True,
        is_deleted=False
    ).count()

    FP = AnnotationPoints.objects.filter(
        image_id__in=validated_images,
        is_original=True,
        is_deleted=True
    ).count()

    FN = AnnotationPoints.objects.filter(
        image_id__in=validated_images,
        is_original=False
    ).count()

    total_model_predictions = TP + FP
    total_ground_truth = TP + FN

    # Metrics calculation
    precision = TP / (TP + FP) if (TP + FP) else 0
    recall = TP / (TP + FN) if (TP + FN) else 0
    f1_score = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0

    # Counting metrics
    total_abs_error = 0
    valid_image_count = 0

    for image in validated_images:
        pred = AnnotationPoints.objects.filter(image_id=image, is_original=True, is_deleted=False).count()
        added = AnnotationPoints.objects.filter(image_id=image, is_original=False).count()
        true_count = pred + added
        
        if true_count > 0:
            total_abs_error += abs(pred - true_count)
            valid_image_count += 1

    MAE = total_abs_error / valid_image_count if valid_image_count else 0

    count_accuracy = round(
        (1 - abs(total_ground_truth - total_model_predictions) / total_ground_truth) * 100,
        2
    )
    return {
        "model": model_name,
        "total_images": total_images,
        "count_accuracy" : count_accuracy,
        "total_ground_truth": total_ground_truth,
        "total_model_predictions": total_model_predictions,
        "TP": TP, "FP": FP, "FN": FN,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1_score, 4),
        "MAE": round(MAE, 4),
    }


def metric_ajax(request):
    """
    Return a partial HTML fragment with model stat cards (AJAX endpoint).

    Called by the frontend to refresh the comparison view without a full
    page reload. Returns a placeholder message if no models are selected.

    Args:
        request: GET request with query params:
            - model (list[str]): One or more model names to compare

    Returns:
        Rendered "metric_templates/model_card.html" with context:
            - comparison (list[dict]): Stats dict per selected model (see get_model_stats)
        HttpResponse: Placeholder <p> tag if no models provided
    """
    selected_models = request.GET.getlist("model")
    if not selected_models:
        return HttpResponse('<p class="placeholder">Select a model to begin.</p>')

    comparison = [get_model_stats(m) for m in selected_models]
    return render(request, "metric_templates/model_card.html", {"comparison": comparison})