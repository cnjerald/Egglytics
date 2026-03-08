#
#
#
#
# FUNCTIONS INVOLVING VIEWING RESULTS
#
#
#
#


from ._imports import *
@transaction.atomic
def add_egg_to_db_point(request, image_id):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    try:
        data = json.loads(request.body.decode("utf-8"))
        x = data.get("x")
        y = data.get("y")

        # 🔒 LOCK ROWS
        image = ImageDetails.objects.select_for_update().get(image_id=image_id)
        batch = BatchDetails.objects.select_for_update().get(id=image.batch_id)

        # ✅ Create point FIRST (source of truth)
        AnnotationPoints.objects.create(
            image=image,
            x=x,
            y=y,
            is_original=False
        )

        # ✅ Atomic increments (NO RACE CONDITION)
        ImageDetails.objects.filter(pk=image.pk).update(total_eggs=F("total_eggs") + 1)
        BatchDetails.objects.filter(pk=batch.pk).update(total_eggs=F("total_eggs") + 1)

        return JsonResponse({"STATUS": "Added"})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)
@transaction.atomic
def remove_egg_from_db_point(request, image_id):
    if request.method != "POST":
        return JsonResponse({"STATUS": "Invalid request"}, status=400)

    try:
        data = json.loads(request.body.decode("utf-8"))
        x = data.get("x")
        y = data.get("y")

        # 🔒 Lock image & batch rows
        image = ImageDetails.objects.select_for_update().get(image_id=image_id)
        batch = BatchDetails.objects.select_for_update().get(id=image.batch_id)

        point = AnnotationPoints.objects.select_for_update().filter(
            image_id=image_id, x=x, y=y
        ).first()

        if not point:
            return JsonResponse({"STATUS": "Point not found"}, status=404)

        # Handle delete logic
        if point.is_original:
            point.is_deleted = True
            point.save()
        else:
            point.delete()

        # Prevent negative counts
        ImageDetails.objects.filter(pk=image.pk).update(
            total_eggs=F("total_eggs") - 1
        )
        BatchDetails.objects.filter(pk=batch.pk).update(
            total_eggs=F("total_eggs") - 1
        )

        return JsonResponse({"STATUS": "Deleted"})

    except Exception as e:
        return JsonResponse({"STATUS": f"Error: {str(e)}"}, status=500)

    return JsonResponse({"STATUS": "Invalid request"}, status=400)
def add_egg_to_db_rect(request, image_id):
    if request.method == "POST":
        try:
            data = json.loads(request.body.decode("utf-8"))
            print("DEBUG POST DATA:", data)

            x1 = data.get("x1")
            y1 = data.get("y1")
            x2 = data.get("x2")
            y2 = data.get("y2")

            # 🔑 NORMALIZE HERE
            x1, y1, x2, y2 = normalize_rect(x1, y1, x2, y2)

            image = get_object_or_404(ImageDetails, image_id=image_id)

            rect = AnnotationRect.objects.create(
                image_id=image_id,
                x_init=x1,
                y_init=y1,
                x_end=x2,
                y_end=y2,
                is_original=False
            )

            return JsonResponse({"STATUS": "OK"})

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Invalid method"}, status=405)
def remove_egg_from_db_rect(request, image_id):
    if request.method == "POST":
        try:
            data = json.loads(request.body.decode("utf-8"))
            print("DEBUG POST DATA:", data)

            x1 = data.get("x1")
            y1 = data.get("y1")
            x2 = data.get("x2")
            y2 = data.get("y2")

            # NORMALIZE HERE TOO
            x1, y1, x2, y2 = normalize_rect(x1, y1, x2, y2)

            rect = AnnotationRect.objects.filter(
                image_id=image_id,
                x_init=x1,
                y_init=y1,
                x_end=x2,
                y_end=y2
            ).first()

            if not rect:
                return JsonResponse({"STATUS": "Rect not found"}, status=404)

            if rect.is_original:
                rect.is_deleted = True
                rect.save()
            else:
                rect.delete()

            return JsonResponse({"STATUS": "Deleted"})

        except Exception as e:
            return JsonResponse({"STATUS": f"Error: {str(e)}"}, status=500)

    return JsonResponse({"STATUS": "Invalid request"}, status=400)

def normalize_rect(x1, y1, x2, y2):
    return (
        min(x1, x2),
        min(y1, y2),
        max(x1, x2),
        max(y1, y2),
    )

def toggleGrid(request, image_id):
    if request.method == "POST":
        try:
            data = json.loads(request.body.decode("utf-8"))
            print("DEBUG POST DATA:", data)

            x = data.get("x")
            y = data.get("y")

            print(image_id, x,y)
            grid_exists = VerifiedGrids.objects.filter(image_id = image_id, x=x, y=y).first()
            if(grid_exists):
                grid_exists.delete()
            else:
                newGrid = VerifiedGrids.objects.create(image_id = image_id, x = x, y = y)
            return JsonResponse({"STATUS": "OK"})    
        except Exception as e:
            return JsonResponse({"STATUS": f"Error: {str(e)}"}, status=500)

    return JsonResponse({"STATUS": "Invalid request"}, status=400)

