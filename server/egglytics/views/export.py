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
    format_type = request.GET.get("format", "custom")
    verified = request.GET.get("verified") == "1"
    date_from = request.GET.get("date_from")
    date_to = request.GET.get("date_to")

    if not model:
        return JsonResponse({"error": "Model required"}, status=400)

    # -------------------------
    # Filter Images
    # -------------------------
    qs = ImageDetails.objects.filter(model_used=model)

    if verified:
        qs = qs.filter(is_validated=True)

    if date_from:
        qs = qs.filter(date_uploaded__date__gte=parse_date(date_from))

    if date_to:
        qs = qs.filter(date_uploaded__date__lte=parse_date(date_to))

    if not qs.exists():
        return JsonResponse({"error": "No data to export"}, status=404)

    # -------------------------
    # Create ZIP
    # -------------------------
    buffer = BytesIO()
    zip_file = zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED)

    #  COCO containers (IMPORTANT — MUST BE BEFORE LOOP)
    coco_images = []
    coco_annotations = []
    annotation_id = 1

    for image in qs:
        
        image_path = os.path.join(settings.MEDIA_ROOT, "uploads", image.file_path)

        if not os.path.exists(image_path):
            continue

        zip_file.write(
            image_path,
            arcname=f"images/{image.image_name}.jpg"
        )

        # Get image size
        with Image.open(image_path) as img:
            width, height = img.size

        points = AnnotationPoints.objects.filter(image_id=image)
        rects = AnnotationRect.objects.filter(image_id=image)

        # =========================
        # CUSTOM FORMAT
        # =========================
        if format_type == "custom":
            annotation_data = []

            for p in points:
                annotation_data.append({
                    "label": "Egg",
                    "type": "point",
                    "x": p.x,  # Just the center coordinates
                    "y": p.y,  # No conversion needed
                })

            for r in rects:
                annotation_data.append({
                    "label": "Egg",
                    "type": "rectangle",
                    "x": r.x,
                    "y": r.y,
                    "width": r.width,
                    "height": r.height,
                })

            zip_file.writestr(
                f"annotations/{image.image_name}.json",
                json.dumps(annotation_data, indent=2)
            )

        # =========================
        # YOLO FORMAT
        # =========================
        elif format_type == "yolo":

            yolo_lines = []

            for r in rects:
                x_center = (r.x + r.width / 2) / width
                y_center = (r.y + r.height / 2) / height
                w = r.width / width
                h = r.height / height
                yolo_lines.append(f"0 {x_center} {y_center} {w} {h}")

            for p in points:
                box_size = 10
                x_center = p.x / width  # Already center ✓
                y_center = p.y / height  # Already center ✓
                w = box_size / width
                h = box_size / height
                yolo_lines.append(f"0 {x_center} {y_center} {w} {h}")

            # Write YOLO label file
            label_name = os.path.splitext(image.image_name)[0] + ".txt"
            zip_file.writestr(
                f"labels/{label_name}",
                "\n".join(yolo_lines)
            )

        # =========================
        # COCO FORMAT
        # =========================
        elif format_type == "coco":

            image_id = image.image_id

            coco_images.append({
                "id": image_id,
                "file_name": image.image_name,
                "width": width,
                "height": height
            })

            for r in rects:
                # Rects are already in top-left format
                coco_annotations.append({
                    "id": annotation_id,
                    "image_id": image_id,
                    "category_id": 1,
                    "bbox": [r.x, r.y, r.width, r.height],
                    "area": r.width * r.height,
                    "iscrowd": 0
                })
                annotation_id += 1

            for p in points:
                box_size = 10
                # Convert center point to top-left corner for COCO bbox format
                x_top_left = p.x - (box_size / 2)
                y_top_left = p.y - (box_size / 2)
                
                coco_annotations.append({
                    "id": annotation_id,
                    "image_id": image_id,
                    "category_id": 1,
                    "bbox": [x_top_left, y_top_left, box_size, box_size],
                    "area": box_size * box_size,
                    "iscrowd": 0
                })
                annotation_id += 1

    # WRITE COCO FILE AFTER LOOP
    if format_type == "coco":

        coco_output = {
            "images": coco_images,
            "annotations": coco_annotations,
            "categories": [
                {
                    "id": 1,
                    "name": "Egg",
                    "supercategory": "object"
                }
            ]
        }

        zip_file.writestr(
            "annotations/instances.json",
            json.dumps(coco_output, indent=2)
        )

    # -------------------------
    # Save ZIP to media folder
    # -------------------------
    zip_file.close()
    buffer.seek(0)

    filename = f"export_{model}_{now().strftime('%Y%m%d_%H%M%S')}.zip"
    
    # Save to media/exports directory
    export_dir = os.path.join(settings.MEDIA_ROOT, "exports")
    os.makedirs(export_dir, exist_ok=True)
    
    file_path = os.path.join(export_dir, filename)
    with open(file_path, 'wb') as f:
        f.write(buffer.getvalue())
    
    # Return JSON with download URL
    download_url = f"{settings.MEDIA_URL}exports/{filename}"
    
    return JsonResponse({
        "success": True,
        "filename": filename,
        "download_url": download_url
    })



def export_dataset_csv(request):
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