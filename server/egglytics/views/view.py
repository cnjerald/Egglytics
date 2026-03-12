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

# This is where user can see what was uploaded..
def view(request):
    """
    Render the main batch overview page.

    Displays all batches sorted by most recently updated, along with
    aggregate totals across all batches.

    Args:
        request: GET request

    Returns:
        Rendered response with template "view.html" and context:
            - batches (QuerySet): All BatchDetails with prefetched images, newest first
            - total_images (int): Sum of total_images across all batches
            - total_eggs (int): Sum of total_eggs across all batches
    """
    # Get batches, sorted by date_updated descending
    batches = (
        BatchDetails.objects
        .prefetch_related("imagedetails_set")
        .order_by("-date_updated")
    )

    totals = BatchDetails.objects.aggregate(
        total_images=Sum("total_images"),
        total_eggs=Sum("total_eggs"),
    )


    return render(
        request,
        "base.html",
        {
            "included_template": "view.html",
            "batches": batches,
            "MEDIA_URL": settings.MEDIA_URL,
            "total_images": totals["total_images"] or 0,
            "total_eggs": totals["total_eggs"] or 0,
        }
    )

def batch_images(request, batch_id):
    """
    Return all images belonging to a batch as JSON.

    Args:
        request: GET request
        batch_id (int): PK of the target BatchDetails record

    Returns:
        JsonResponse: List of image dicts, each containing:
            - image_id, image_name, image_path, image_url,
              total_eggs, img_type, total_hatched, is_processed
    """
    images = ImageDetails.objects.filter(batch_id=batch_id)

    data = []

    for img in images:
        # If using ImageField:
        # image_url = img.image.url
        
        # If using just a filename (string) stored in path:
        image_url = f"{settings.MEDIA_URL}uploads/{img.file_path}"
        print(image_url)

        data.append({
            "image_id": img.image_id,
            "image_name": img.image_name,
            "image_path": img.file_path,
            "image_url": image_url,
            "total_eggs": img.total_eggs,
            "img_type": img.img_type,
            "total_hatched": img.total_hatched,
            "is_processed": img.is_processed
        })

    return JsonResponse(data, safe=False)

def batch_status(request):
    """
    Return status fields for all batches as JSON.

    Args:
        request: GET request

    Returns:
        JsonResponse: List of dicts with fields:
            id, total_eggs, total_images, is_complete, has_fail_present
    """
    batches = BatchDetails.objects.values(
        "id", "total_eggs", "total_images", "is_complete","has_fail_present"
    )
    return JsonResponse(list(batches), safe=False)

def batch_status_latest(request):
    """
    Return status fields for the most recently created batch.

    Args:
        request: GET request

    Returns:
        JsonResponse: Single dict with fields:
            id, total_eggs, total_images, is_complete, has_fail_present
        JsonResponse: Empty dict {} if no batches exist
    """
    latest_batch = BatchDetails.objects.order_by('-id').values(
        "id", "total_eggs", "total_images", "is_complete", "has_fail_present"
    ).first()  # returns a dict or None

    if latest_batch:
        return JsonResponse(latest_batch, safe=True)  # single object
    else:
        return JsonResponse({}, safe=True)  # return empty dict if none found

# This is the server side for the scripts
# Sends it to the editor HTML.
def edit(request, image_id):
    image = get_object_or_404(ImageDetails, image_id=image_id)

    if not image.is_validated:
        image.is_validated = True
        image.save()

    annotations = AnnotationPoints.objects.filter(image=image, is_deleted=False).values(
        "point_id", "x", "y"
    )
    rectangles = AnnotationRect.objects.filter(image=image, is_deleted=False).values(
        "rect_id", "x_init", "y_init", "x_end", "y_end"
    )
    grids = VerifiedGrids.objects.filter(image=image).values(
        "x", "y"
    )

    generate_preview_image(os.path.join(settings.MEDIA_ROOT, 'uploads', image.file_path))

    base, ext = os.path.splitext(image.file_path)
    preview_relative = f"uploads/{base}_preview{ext}"

    return render(
        request,
        "base.html",
        {
            "included_template": "editor.html",
            "image_name": image.file_path,  # full res
            "image_preview": preview_relative,   # compressed preview
            "image_version": image.image_version,
            "points_json": json.dumps(list(annotations)),
            "rects_json": json.dumps(list(rectangles)),
            "total_eggs": json.dumps(image.total_eggs),
            "grids_json": json.dumps(list(grids)),
            "img_id": json.dumps(image_id),
            "MEDIA_URL": settings.MEDIA_URL,
        }
    )


def edit_batch_name(request, batch_id):
    """
    Update the display name of a batch.

    Args:
        request: POST request with JSON body containing:
            - batch_name (str): New name (must be non-empty)
        batch_id (int): PK of the target BatchDetails record

    Returns:
        JsonResponse: {"success": True} on success
        JsonResponse: {"success": False, "message": str} on validation error or not found
    """
    if request.method == "POST":
        import json
        data = json.loads(request.body)
        new_name = data.get("batch_name", "").strip()
        if not new_name:
            return JsonResponse({"success": False, "message": "Batch name cannot be empty."})
        try:
            batch = BatchDetails.objects.get(id=batch_id)
            batch.batch_name = new_name
            batch.save()
            return JsonResponse({"success": True})
        except BatchDetails.DoesNotExist:
            return JsonResponse({"success": False, "message": "Batch not found."})
    return JsonResponse({"success": False, "message": "Invalid request."})

# This deletes the batch and everything associated with it (Image details and Points)
# It does not delete the image saved on local disk as of now.
def delete_batch(request, batch_id):
    """
    Permanently delete a batch, all its images, annotations, and image files on disk.

    Deletes in order: image files → AnnotationPoints → ImageDetails → BatchDetails.

    Args:
        request: POST request
        batch_id (int): PK of the target BatchDetails record

    Returns:
        JsonResponse: {"success": True} on success
        JsonResponse: {"error": "Batch not found"} with status 404
        JsonResponse: {"error": str} with status 500 on exception
        JsonResponse: {"error": "Invalid method"} with status 405 for non-POST

    Notes:
        - Missing image files on disk are silently skipped
    """
    if request.method == "POST":
        try:
            batch = BatchDetails.objects.get(id=batch_id)
            images = ImageDetails.objects.filter(batch=batch)

            # DELETE IMAGE FILES FROM DISK FIRST
            for image in images:
                if image.file_path:  # make sure path exists in DB
                    image_path = os.path.join(settings.MEDIA_ROOT, 'uploads', image.file_path)
                    if os.path.exists(image_path):
                        os.remove(image_path)

            # Delete annotations
            AnnotationPoints.objects.filter(image__in=images).delete()

            # Delete image records
            images.delete()

            # Delete batch
            batch.delete()

            return JsonResponse({"success": True})

        except BatchDetails.DoesNotExist:
            return JsonResponse({"error": "Batch not found"}, status=404)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Invalid method"}, status=405)

def delete_image(request, image_id):
    """
    Permanently delete a single image, its annotations, and its file on disk.

    Subtracts the image's egg count from the parent batch. If this was the
    last image in the batch, the batch itself is also deleted.

    Args:
        request: POST request
        image_id (int): PK of the target ImageDetails record

    Returns:
        JsonResponse: {
            "success": True,
            "batch_deleted": bool,
            "new_total_images": int,  # omitted if batch deleted
            "new_total_eggs": int     # omitted if batch deleted
        }
        JsonResponse: {"success": False, "message": str} with status 404 or 400
    """
    if request.method == "POST":
        try:
            # Get the image
            image = ImageDetails.objects.get(image_id=image_id)
            batch = image.batch 

            # Delete related annotations
            AnnotationPoints.objects.filter(image=image).delete()

            # Subtract the image's eggs from batch total
            batch.total_eggs -= image.total_eggs
            
            # Delete the actual file from MEDIA_ROOT/uploads/
            image_path = os.path.join(settings.MEDIA_ROOT, 'uploads', image.file_path)
            if os.path.exists(image_path):
                os.remove(image_path)

            # Delete image
            image.delete()

            # Decrement total_images
            batch.total_images -= 1

            if batch.total_images <= 0:
                batch.delete()
                return JsonResponse({
                    "success": True,
                    "message": "Image deleted. Batch removed because no images left.",
                    "batch_deleted": True
                })
            else:
                batch.save()
                return JsonResponse({
                    "success": True,
                    "message": "Image deleted successfully.",
                    "batch_deleted": False,
                    "new_total_images": batch.total_images,
                    "new_total_eggs": batch.total_eggs
                })

        except ImageDetails.DoesNotExist:
            return JsonResponse({"success": False, "message": "Image not found."}, status=404)
        except Exception as e:
            return JsonResponse({"success": False, "message": str(e)}, status=500)
    else:
        return JsonResponse({"success": False, "message": "Invalid request method."}, status=400)
    
def update_hatched(request, image_id):
    """
    Update the total_hatched count for an image.

    Args:
        request: POST request with JSON body containing:
            - total_hatched (int): New hatched count
        image_id (int): PK of the target ImageDetails record

    Returns:
        JsonResponse: {"success": True} on success
        JsonResponse: {"success": False, "error": str} with status 400 on exception
        JsonResponse: {"success": False} with status 405 for non-POST
    """
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            new_value = int(data.get("total_hatched"))

            image = ImageDetails.objects.get(image_id=image_id)
            image.total_hatched = new_value
            image.save()

            return JsonResponse({"success": True})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=400)

    return JsonResponse({"success": False}, status=405)

def update_image_name(request, image_id):
    """
    Update the display name of an image.

    Args:
        request: POST request with JSON body containing:
            - image_name (str): New name (must be non-empty)
        image_id (int): PK of the target ImageDetails record

    Returns:
        JsonResponse: {"success": True} on success
        JsonResponse: {"success": False, "message": str} for empty name
        JsonResponse: {"success": False, "error": str} with status 400 on exception
        JsonResponse: {"success": False} with status 405 for non-POST
    """
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            new_name = data.get("image_name", "").strip()

            if not new_name:
                return JsonResponse({"success": False, "message": "Empty name"})

            image = ImageDetails.objects.get(image_id=image_id)  # ✅ SAME MODEL
            image.image_name = new_name
            image.save()

            return JsonResponse({"success": True})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=400)

    return JsonResponse({"success": False}, status=405)


def serve_thumbnail(request, image_path):
    """
    Serve a resized thumbnail of an uploaded image.

    Resizes the image to fit within the requested dimensions while
    preserving aspect ratio (LANCZOS resampling). Always returns JPEG.

    Args:
        request: GET request with optional query params:
            - w (int): Max width in pixels (default: 800)
            - h (int): Max height in pixels (default: 600)
        image_path (str): Relative path within MEDIA_ROOT/uploads/

    Returns:
        HttpResponse: JPEG image at quality=80
        HttpResponse: status 404 if file not found
        HttpResponse: status 500 on any other error
    """
    width = int(request.GET.get('w', 800))
    height = int(request.GET.get('h', 600))
    
    full_path = os.path.join(settings.MEDIA_ROOT, 'uploads', image_path)
    
    try:
        img = Image.open(full_path)
        img.thumbnail((width, height), Image.LANCZOS)
        
        buffer = BytesIO()
        img.save(buffer, format='JPEG', quality=80, optimize=True)
        buffer.seek(0)
        
        return HttpResponse(buffer, content_type='image/jpeg')
    except FileNotFoundError:
        print(f"File not found: {full_path}")  # Debug
        return HttpResponse(status=404)
    except Exception as e:
        print(f"Error serving thumbnail: {e}")  # Debug
        return HttpResponse(status=500)

def generate_preview_image(original_path, quality=20):
    """
    Create a compressed preview image for fast loading.

    Args:
        original_path (str): Full path to the original image
        quality (int): JPEG quality for compression (1-95)

    Returns:
        str: Path to the compressed preview image
    """
    base, ext = os.path.splitext(original_path)
    preview_path = f"{base}_preview{ext}"

    if os.path.exists(preview_path):
        print("This image exist!")
        return preview_path

    with Image.open(original_path) as img:
        img.save(preview_path, optimize=True, quality=quality)

    print(preview_path)
    return preview_path