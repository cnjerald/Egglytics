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

    """
    Render the export page with a list of available models.

    Fetches all distinct model names from ImageDetails and passes
    them to the export template for the user to select from.

    Args:
        request: GET request

    Returns:
        Rendered response with template "export.html" and context:
            - models (QuerySet): Distinct model_used values
    """

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
    """
    Return the earliest and latest upload dates for a given model.

    Used to populate date range pickers on the export UI.

    Args:
        request: GET request with query params:
            - model (str): The model name to query

    Returns:
        JsonResponse: {"dateFrom": "YYYY-MM-DD", "dateTo": "YYYY-MM-DD"}
        JsonResponse: {"error": "No model selected"} with status 400
        JsonResponse: {"error": "No data for model"} with status 404
    """
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
    """
    Return counts of images, annotation points, and rectangles for a filtered dataset.

    Used to give users a preview of how many records will be included
    before they trigger a full export.

    Args:
        request: GET request with query params:
            - model (str): Model name to filter by
            - verified (str): "1" to include only validated images
            - date_from (str, optional): Start date (YYYY-MM-DD)
            - date_to (str, optional): End date (YYYY-MM-DD)

    Returns:
        JsonResponse: {
            "total_images": int,
            "total_points": int,
            "total_rects": int
        }
        JsonResponse: {"error": "No model selected"} with status 400
    """
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
    """
    Export a filtered image dataset as a ZIP file in one of three annotation formats.

    Handles points and rectangles correctly based on your models.
    """
    model = request.GET.get("model")
    format_type = request.GET.get("format", "custom")
    verified = request.GET.get("verified") == "1"
    date_from = request.GET.get("date_from")
    date_to = request.GET.get("date_to")

    if not model:
        return JsonResponse({"error": "Model required"}, status=400)

    # Filter images
    qs = ImageDetails.objects.filter(model_used=model)
    if verified:
        qs = qs.filter(is_validated=True)
    if date_from:
        qs = qs.filter(date_uploaded__date__gte=parse_date(date_from))
    if date_to:
        qs = qs.filter(date_uploaded__date__lte=parse_date(date_to))

    if not qs.exists():
        return JsonResponse({"error": "No data to export"}, status=404)

    # Create ZIP in memory
    buffer = BytesIO()
    zip_file = zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED)

    # COCO containers
    coco_images = []
    coco_annotations = []
    annotation_id = 1

    for image in qs:
        image_path = os.path.join(settings.MEDIA_ROOT, "uploads", image.file_path)
        if not os.path.exists(image_path):
            continue

        zip_file.write(image_path, arcname=f"images/{image.image_name}.jpg")

        with Image.open(image_path) as img:
            width, height = img.size

        points = AnnotationPoints.objects.filter(image=image, is_deleted=False)
        rects = AnnotationRect.objects.filter(image=image, is_deleted=False)

        # ----------------------------
        # CUSTOM FORMAT
        # ----------------------------
        if format_type == "custom":
            annotation_data = []

            # Only include points in custom format
            for p in points:
                annotation_data.append({
                    "label": "Egg",
                    "type": "point",
                    "x": p.x,
                    "y": p.y
                })

            # Rectangles for all formats
            for r in rects:
                x = r.x_init
                y = r.y_init
                w = r.x_end - r.x_init
                h = r.y_end - r.y_init
                annotation_data.append({
                    "label": "Egg",
                    "type": "rectangle",
                    "x": x,
                    "y": y,
                    "width": w,
                    "height": h
                })

            zip_file.writestr(
                f"annotations/{image.image_name}.json",
                json.dumps(annotation_data, indent=2)
            )

        # ----------------------------
        # YOLO FORMAT
        # ----------------------------
        elif format_type == "yolo":
            yolo_lines = []

            for r in rects:
                x = r.x_init
                y = r.y_init
                w = r.x_end - r.x_init
                h = r.y_end - r.y_init
                x_center = (x + w / 2) / width
                y_center = (y + h / 2) / height
                w_norm = w / width
                h_norm = h / height
                yolo_lines.append(f"0 {x_center} {y_center} {w_norm} {h_norm}")

            # Points are **skipped** in YOLO now

            label_name = os.path.splitext(image.image_name)[0] + ".txt"
            zip_file.writestr(f"labels/{label_name}", "\n".join(yolo_lines))

        # ----------------------------
        # COCO FORMAT
        # ----------------------------
        elif format_type == "coco":
            image_id = image.image_id
            coco_images.append({
                "id": image_id,
                "file_name": image.image_name,
                "width": width,
                "height": height
            })

            for r in rects:
                x = r.x_init
                y = r.y_init
                w = r.x_end - r.x_init
                h = r.y_end - r.y_init
                coco_annotations.append({
                    "id": annotation_id,
                    "image_id": image_id,
                    "category_id": 1,
                    "bbox": [x, y, w, h],
                    "area": w * h,
                    "iscrowd": 0
                })
                annotation_id += 1

            # Points are **skipped** in COCO now

    # Write COCO JSON after loop
    if format_type == "coco":
        coco_output = {
            "images": coco_images,
            "annotations": coco_annotations,
            "categories": [{"id": 1, "name": "Egg", "supercategory": "object"}]
        }
        zip_file.writestr("annotations/instances.json", json.dumps(coco_output, indent=2))

    # Save ZIP to media folder
    zip_file.close()
    buffer.seek(0)
    filename = f"export_{model}_{now().strftime('%Y%m%d_%H%M%S')}.zip"
    export_dir = os.path.join(settings.MEDIA_ROOT, "exports")
    os.makedirs(export_dir, exist_ok=True)
    file_path = os.path.join(export_dir, filename)
    with open(file_path, "wb") as f:
        f.write(buffer.getvalue())

    download_url = f"{settings.MEDIA_URL}exports/{filename}"
    return JsonResponse({
        "success": True,
        "filename": filename,
        "download_url": download_url
    })



def export_dataset_csv(request):
    """
    Export a summary CSV of egg and hatch counts per image.

    Each row contains the image name, upload date, total egg count
    (from AnnotationPoints), and total hatched count. The CSV is saved
    to `MEDIA_ROOT/exports/` and a download URL is returned.

    Args:
        request: GET request with query params:
            - model (str): Model name to filter by (required)
            - verified (str): "1" to include only validated images
            - date_from (str, optional): Start date (YYYY-MM-DD)
            - date_to (str, optional): End date (YYYY-MM-DD)

    Returns:
        JsonResponse: {"success": True, "filename": str, "download_url": str}
        JsonResponse: {"error": "Model required"} with status 400
        JsonResponse: {"error": "No data to export"} with status 404

    CSV columns:
        ImageName, DATE, total_Eggs, Total_HATCHED
    """
    model = request.GET.get("model")
    verified = request.GET.get("verified") == "1"
    date_from = request.GET.get("date_from")
    date_to = request.GET.get("date_to")

    if not model:
        return JsonResponse({"error": "Model required"}, status=400)

    # ---- Filter images ----
    qs = ImageDetails.objects.filter(model_used=model)

    if verified:
        qs = qs.filter(is_validated=True)

    if date_from:
        qs = qs.filter(date_uploaded__date__gte=parse_date(date_from))
    if date_to:
        qs = qs.filter(date_uploaded__date__lte=parse_date(date_to))

    if not qs.exists():
        return JsonResponse({"error": "No data to export"}, status=404)

    # ---- Create CSV file ----
    filename = f"export_{model}_{now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    # Save to media/exports directory
    export_dir = os.path.join(settings.MEDIA_ROOT, "exports")
    os.makedirs(export_dir, exist_ok=True)
    
    file_path = os.path.join(export_dir, filename)
    
    with open(file_path, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["ImageName", "DATE", "total_Eggs", "Total_HATCHED"])

        for image in qs:
            total_eggs = AnnotationPoints.objects.filter(image_id=image).count()
            writer.writerow([
                image.image_name,
                image.date_uploaded.strftime("%Y-%m-%d"),
                total_eggs,
                image.total_hatched
            ])
    
    # Return JSON with download URL
    download_url = f"{settings.MEDIA_URL}exports/{filename}"
    
    return JsonResponse({
        "success": True,
        "filename": filename,
        "download_url": download_url
    })