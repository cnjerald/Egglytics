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

def add_egg_to_db(request, image_id):
    if request.method == "POST":
        try:
            
            data = json.loads(request.body.decode("utf-8"))
            print("DEBUG POST DATA:", data)  # 👈 see what came in
            x = data.get("x")
            y = data.get("y")

            # Fetch the image entry
            image = get_object_or_404(ImageDetails, image_id=image_id)
            batch = image.batch

            # Increment total eggs
            image.total_eggs = (image.total_eggs or 0) + 1
            image.save()
            batch.total_eggs = (batch.total_eggs or 0) + 1
            batch.save()

            point = AnnotationPoints.objects.create(
                image_id=image_id,
                x=x,
                y=y,
                is_original=False
            )

            return JsonResponse({
                "STATUS" : "HI"
            })
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Invalid method"}, status=405)


def remove_egg_from_db(request, image_id):
    if request.method == "POST":
        print("HIT!")
        try:
            data = json.loads(request.body.decode("utf-8"))
            print("DEBUG POST DATA:", data)

            x = data.get("x")
            y = data.get("y")

            # Try to get the point
            point = AnnotationPoints.objects.filter(image_id = image_id, x=x, y=y).first()

            if not point:
                return JsonResponse({"STATUS": "Point not found"}, status=404)

            # Fetch the image entry
            image = get_object_or_404(ImageDetails, image_id=image_id)
            batch = image.batch

            # Decrement total eggs
            image.total_eggs = (image.total_eggs or 0) - 1
            image.save()
            batch.total_eggs = (batch.total_eggs or 0) - 1
            batch.save()

            if point.is_original:
                # mark as deleted instead of removing
                print("[DEBUG]: CASE 1")
                point.is_deleted = True
                point.save()
                return JsonResponse({"STATUS": "Deleted"})
            else:
                # actually remove the row
                AnnotationPoints.objects.filter(image_id=image_id, x=x, y=y).delete()
                return JsonResponse({"STATUS": "Deleted"})
            

        except Exception as e:
            return JsonResponse({"STATUS": f"Error: {str(e)}"}, status=500)

    return JsonResponse({"STATUS": "Invalid request"}, status=400)