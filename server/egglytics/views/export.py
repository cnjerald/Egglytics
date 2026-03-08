#
#
#
#
# FUNCTIONS INVOLVING EXPORTING
#
#
#
#

from ._imports import *


def export(request):
    models = (
        ImageDetails.objects
        .values_list("model_used", flat=True)
        .distinct()
    )

    return render(
        request,
        "base.html",
        {
            "included_template": "export.html",
            "models": models,
        }
    )

def export_date_range(request):
    model = request.GET.get("model")

    if not model:
        return JsonResponse({"error": "No model selected"}, status=400)

    qs = ImageDetails.objects.filter(model_used=model)

    if not qs.exists():
        return JsonResponse({"error": "No data for model"}, status=404)

    dates = qs.aggregate(
        min_date=Min("date_uploaded"),
        max_date=Max("date_uploaded")
    )

    return JsonResponse({
        "dateFrom": dates["min_date"].date().isoformat(),
        "dateTo": dates["max_date"].date().isoformat(),
    })

def export_image_count(request):
    model = request.GET.get("model")
    verified = request.GET.get("verified") == "1"
    date_from = request.GET.get("date_from")
    date_to = request.GET.get("date_to")

    if not model:
        return JsonResponse({"error": "No model selected"}, status=400)

    qs = ImageDetails.objects.filter(model_used=model)

    if verified:
        qs = qs.filter(is_validated=True)

    if date_from:
        parsed_from = parse_date(date_from)
        if parsed_from:
            qs = qs.filter(date_uploaded__date__gte=parsed_from)

    if date_to:
        parsed_to = parse_date(date_to)
        if parsed_to:
            qs = qs.filter(date_uploaded__date__lte=parsed_to)

    total_points = AnnotationPoints.objects.filter(
        image__in=qs
    ).count()

    total_rect = AnnotationRect.objects.filter(
        image__in=qs
    ).count()

    return JsonResponse({
        "total_images": qs.count(),
        "total_points": total_points,
        "total_rects": total_rect
    })

def export_dataset(request):
    model = request.GET.get("model")
    verified = request.GET.get("verified") == "1"
    date_from = request.GET.get("date_from")
    date_to = request.GET.get("date_to")

    if not model:
        return HttpResponse("Model required", status=400)

    # ---- Filter images ----
    # Filter images
    qs = ImageDetails.objects.filter(model_used=model)

    # Filter images that were validated by the user
    if verified:
        qs = qs.filter(is_validated=True)

    # Start Date
    if date_from:
        qs = qs.filter(date_uploaded__date__gte=parse_date(date_from))

    # End Date
    if date_to:
        qs = qs.filter(date_uploaded__date__lte=parse_date(date_to))

    if not qs.exists():
        return HttpResponse("No data to export", status=404)

    # ---- Create ZIP in memory ----
    buffer = BytesIO()
    zip_file = zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED)

    for image in qs:
        # ---------------------
        # Add image file
        # ---------------------
        print(image.image_name)
        image_path = os.path.join(settings.MEDIA_ROOT, "uploads", image.image_name)


        if os.path.exists(image_path):
            print("DEUBG!")
            zip_file.write(
                image_path,
                arcname=f"images/{image.image_name}"
            )

        # ---------------------
        # Add annotations
        # ---------------------
        points = AnnotationPoints.objects.filter(image_id=image)

        annotation_data = []
        for p in points:
            annotation_data.append({
                "label": "Egg",
                "x": p.x,
                "y": p.y,
            })

        annotation_json = json.dumps(annotation_data, indent=2)

        # ---------------------
        # Add metadata
        # ---------------------
        
        zip_file.writestr(
            f"annotations/{image.image_name}.json",
            annotation_json
        )
    
    today_date_object = datetime.today()
    metadata = {
        "model_used": model,
        "date_downloaded": str(today_date_object),
        "total_images": qs.count(),
        "start_date": date_from,
        "end_date": date_to,
        "format": "JSON"
    }

    # Convert metadata to formatted JSON string
    metadata_text = json.dumps(metadata, indent=2)

    # Write metadata.txt into ZIP
    zip_file.writestr("metadata.txt", metadata_text)

    zip_file.close()
    buffer.seek(0)

    # ---- HTTP response ----
    filename = f"export_{model}_{now().strftime('%Y%m%d_%H%M%S')}.zip"

    response = HttpResponse(buffer, content_type="application/zip")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'

    return response
