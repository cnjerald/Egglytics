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
    """Renders the full page."""
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
    """A helper function to do all the math in one place."""
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

    return {
        "model": model_name,
        "total_images": total_images,
        "total_ground_truth": total_ground_truth,
        "total_model_predictions": total_model_predictions,
        "TP": TP, "FP": FP, "FN": FN,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1_score, 4),
        "MAE": round(MAE, 4),
    }

def model_summary_view(request):
    # Get all unique model names for the dropdown
    models = EvaluationResult.objects.values_list('model_name', flat=True).distinct()
    return render(request, 'metrics.html', {'models': models})

def metric_ajax_view(request):
    selected_names = request.GET.getlist('model')
    results = EvaluationResult.objects.filter(model_name__in=selected_names)

    comparison = []
    for r in results:
        comparison.append({
            'model': r.model_name,
            'total_images': r.total_images,
            'total_ground_truth': r.gt_count,
            'total_model_predictions': r.pred_count,
            'TP': r.tp, 'FP': r.fp, 'FN': r.fn,
            'precision': f"{r.precision:.2f}",
            'recall': f"{r.recall:.2f}",
            'f1_score': f"{r.f1:.2f}",
            'MAE': f"{r.mae:.2f}"
        })

    return JsonResponse({'comparison': comparison})

def metric_ajax(request):
    """Returns only the JSON data."""
    selected_models = request.GET.getlist("model")
    if not selected_models:
        return JsonResponse({"error": "No model selected"}, status=400)

    comparison = [get_model_stats(m) for m in selected_models]
    return JsonResponse({"comparison": comparison})