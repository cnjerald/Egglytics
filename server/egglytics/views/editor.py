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
    """
    Add a new annotation point (egg) to the database.

    Atomically creates a new AnnotationPoints record and increments
    egg counts on both ImageDetails and BatchDetails.

    Args:
        request: POST request with JSON body containing:
            - x (int): X coordinate of the point
            - y (int): Y coordinate of the point
        image_id (int): PK of the target ImageDetails record

    Returns:
        JsonResponse: {"STATUS": "Added"} on success
        JsonResponse: {"error": <message>} with status 400 on failure

    Notes:
        - New points are marked is_original=False
        - Row-level locks (select_for_update) prevent race conditions
    """

    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    try:
        data = json.loads(request.body.decode("utf-8"))
        x = data.get("x")
        y = data.get("y")

        # LOCK ROWS
        image = ImageDetails.objects.select_for_update().get(image_id=image_id)
        batch = BatchDetails.objects.select_for_update().get(id=image.batch_id)

        # Create point FIRST (source of truth)
        AnnotationPoints.objects.create(
            image=image,
            x=x,
            y=y,
            is_original=False
        )

        # Atomic increments (NO RACE CONDITION)
        ImageDetails.objects.filter(pk=image.pk).update(total_eggs=F("total_eggs") + 1)
        BatchDetails.objects.filter(pk=batch.pk).update(total_eggs=F("total_eggs") + 1)

        return JsonResponse({"STATUS": "Added"})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)
@transaction.atomic
def remove_egg_from_db_point(request, image_id):

    """
    Remove an annotation point (egg) from the database.

    Looks up the point by (image_id, x, y). Original points are soft-deleted
    (is_deleted=True); user-added points are hard-deleted. Decrements egg
    counts on both ImageDetails and BatchDetails.

    Args:
        request: POST request with JSON body containing:
            - x (int): X coordinate of the point
            - y (int): Y coordinate of the point
        image_id (int): PK of the target ImageDetails record

    Returns:
        JsonResponse: {"STATUS": "Deleted"} on success
        JsonResponse: {"STATUS": "Point not found"} with status 404 if not found
        JsonResponse: {"STATUS": "Error: ..."} with status 500 on exception
    """

    if request.method != "POST":
        return JsonResponse({"STATUS": "Invalid request"}, status=400)

    try:
        data = json.loads(request.body.decode("utf-8"))
        x = data.get("x")
        y = data.get("y")

        # Lock image & batch rows
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


def add_egg_to_db_rect(request, image_id):
     
    """
    Add a new annotation rectangle (egg region) to the database.

    Coordinates are normalized before saving so that (x1, y1) is always
    the top-left corner and (x2, y2) is always the bottom-right corner.

    Args:
        request: POST request with JSON body containing:
            - x1, y1 (int): First corner coordinates
            - x2, y2 (int): Opposite corner coordinates
        image_id (int): PK of the target ImageDetails record

    Returns:
        JsonResponse: {"STATUS": "OK"} on success
        JsonResponse: {"error": <message>} with status 400/405 on failure

    Notes:
        - Rectangles are marked is_original=False
        - See normalize_rect() for coordinate normalization logic
    """
     
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

    """
    Remove an annotation rectangle (egg region) from the database.

    Looks up the rect by its normalized coordinates. Original rects are
    soft-deleted (is_deleted=True); user-added rects are hard-deleted.

    Args:
        request: POST request with JSON body containing:
            - x1, y1 (int): First corner coordinates
            - x2, y2 (int): Opposite corner coordinates
        image_id (int): PK of the target ImageDetails record

    Returns:
        JsonResponse: {"STATUS": "Deleted"} on success
        JsonResponse: {"STATUS": "Rect not found"} with status 404 if not found
        JsonResponse: {"STATUS": "Error: ..."} with status 500 on exception
    """

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

    """
    Normalize rectangle coordinates so the top-left corner always comes first.

    Ensures x1 <= x2 and y1 <= y2 regardless of the drag direction used
    when the user drew the rectangle.

    Args:
        x1, y1 (int): First corner (any corner)
        x2, y2 (int): Opposite corner (any corner)

    Returns:
        tuple: (min_x, min_y, max_x, max_y)
    """

    return (
        min(x1, x2),
        min(y1, y2),
        max(x1, x2),
        max(y1, y2),
    )

def toggleGrid(request, image_id):
    """
    Toggle a verified grid cell on or off for an image.

    If a VerifiedGrids record matching (image_id, x, y) already exists,
    it is deleted. Otherwise, a new record is created.

    Args:
        request: POST request with JSON body containing:
            - x (int): Grid column index
            - y (int): Grid row index
        image_id (int): PK of the target ImageDetails record

    Returns:
        JsonResponse: {"STATUS": "OK"} on success
        JsonResponse: {"STATUS": "Error: ..."} with status 500 on exception
        JsonResponse: {"STATUS": "Invalid request"} with status 400 for non-POST
    """
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

