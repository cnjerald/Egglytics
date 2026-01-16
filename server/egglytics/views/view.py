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
    # Get incognito batches, sorted by date_updated descending
    batches = (
        BatchDetails.objects.filter(owner="incognito")
        .prefetch_related("imagedetails_set")
        .order_by("-date_updated")
    )

    return render(
        request,
        "base.html",
        {
            "included_template": "view.html",
            "batches": batches,
            "MEDIA_URL": settings.MEDIA_URL,
        }
    )

def batch_images(request, batch_id):
    images = ImageDetails.objects.filter(batch_id=batch_id)

    data = []

    for img in images:
        # If using ImageField:
        # image_url = img.image.url
        
        # If using just a filename (string) stored in image_name:
        image_url = f"{settings.MEDIA_URL}uploads/{img.image_name}"
        print(image_url)

        data.append({
            "image_id": img.image_id,
            "image_name": img.image_name,
            "image_url": image_url,
            "total_eggs": img.total_eggs,
            "img_type": img.img_type
        })

    return JsonResponse(data, safe=False)

def batch_status(request):
    batches = BatchDetails.objects.filter(owner="incognito").values(
        "id", "total_eggs", "total_images", "is_complete","has_fail_present"
    )
    return JsonResponse(list(batches), safe=False)

def batch_status_latest(request):
    # Get the latest batch by id (or by a timestamp if you have one)
    latest_batch = BatchDetails.objects.filter(owner="incognito").order_by('-id').values(
        "id", "total_eggs", "total_images", "is_complete", "has_fail_present"
    ).first()  # returns a dict or None

    if latest_batch:
        return JsonResponse(latest_batch, safe=True)  # single object
    else:
        return JsonResponse({}, safe=True)  # return empty dict if none found

# This is the server side for the scripts
# Sends it to the editor HTML.
def edit(request, image_id):
    # Get image entry
    image = get_object_or_404(ImageDetails, image_id=image_id)

    if not image.is_validated:
        image.is_validated = True
        image.save()
    
    # Get related annotation points
    annotations = AnnotationPoints.objects.filter(image=image, is_deleted = False).values(
        "point_id", "x", "y"
    )

    return render(
        request,
        "base.html",
        {
            "included_template": "test.html",
            "image_name": image.image_name,                # filename only
            "points_json": json.dumps(list(annotations)), # list of dicts for JS
            "total_eggs": json.dumps(image.total_eggs),
            "img_id": json.dumps(image_id),
            "MEDIA_URL": settings.MEDIA_URL,              # add MEDIA_URL for template
        }
    )

def edit_batch_name(request, batch_id):
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
    if request.method == "POST":
        try:
            batch = BatchDetails.objects.get(id=batch_id)
            images = ImageDetails.objects.filter(batch=batch)
            AnnotationPoints.objects.filter(image__in=images).delete()
            images.delete()
            batch.delete()
            return JsonResponse({"success": True})
        except BatchDetails.DoesNotExist:
            return JsonResponse({"error": "Batch not found"}, status=404)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    return JsonResponse({"error": "Invalid method"}, status=405)

def delete_image(request, image_id):
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
            image_path = os.path.join(settings.MEDIA_ROOT, 'uploads', image.image_name)
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