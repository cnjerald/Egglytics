from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.conf import settings
from django.core.files.storage import FileSystemStorage
import numpy as np
import base64
import requests
import os
import json
from datetime import datetime
from django.utils import timezone
from .models import BatchDetails,ImageDetails, AnnotationPoints
import threading

# This is the threadded portion of the compute
def process_images(batch, files_data, header):
    total_eggs = 0
    total_hatched = 0
    # For earch file in the JSON array
    for i, file_dict in enumerate(files_data, start=0):
        try:
            file_name = f"{header}_{i}.jpg"
            encoded = file_dict["data"]
            original_name = file_dict["name"]

            payload = {'image': encoded, 'filename': original_name}
            # Create image_record in db.
            image_record = ImageDetails.objects.create(
                batch=batch,
                image_name=f"image_{i}.jpg",
                total_eggs=0,
                total_hatched=0,
                img_type="MICRO",
                allow_collection=True,
                is_processed=False
            )
            # Send to compute server
            response = requests.post('http://localhost:5000/upload_base64', json=payload)
            # Await results
            data = response.json()
            points = data.get("points")
            image_b64 = data.get("final_image")
            temp_eggs = data.get("egg_count", 0)

            total_eggs += temp_eggs
            image_record.total_eggs = temp_eggs
            image_record.is_processed = True
            image_record.save()
            # Save the images locally
            # But WHY only now? because the model changes the images, and instead of saving two images
            # Only saved the one where model inference was conducted.
            if image_b64:
                img_data = base64.b64decode(image_b64)
                upload_dir = os.path.join(settings.BASE_DIR, "egglytics", "static", "uploads")
                os.makedirs(upload_dir, exist_ok=True)
                file_path = os.path.join(upload_dir, image_record.image_name)
                with open(file_path, "wb") as f_out:
                    f_out.write(img_data)
            # Push point coordinates on the DB
            if points:
                for p in points:
                    AnnotationPoints.objects.create(
                        image=image_record,
                        x=p[0],
                        y=p[1],
                        is_original=True
                    )
        except Exception as e:
            print("Error while processing image:", e)

    batch.total_eggs = total_eggs
    batch.total_hatched = total_hatched
    batch.is_complete = True
    batch.save()

# This is where the image is initially send after clicking the submit button in the upload.html.
# It basically saves the image on the backend, then fires a redirect to the user to the view page once saved.
# To do this, it creates a separate thread on compute such that the user does not need to wait for the images
# To be processed, only uploaded to the server.
def upload(request):
    if request.method == 'POST' and request.FILES.getlist('myfiles'):
        # Get the current time now, creating a unique key
        header = datetime.now().strftime("%Y%m%d_%H%M%S")
        # By now this is set to incognito
        owner = request.user.username if request.user.is_authenticated else 'incognito'
        # This just concats a unique key
        batch_name = f"{header}_{owner}"
        date = timezone.now()

        # This is the total images
        total_images = len(request.FILES.getlist('myfiles'))

        # Create a batch entry on the DB
        batch = BatchDetails.objects.create(
            batch_name=batch_name,
            owner=owner,
            total_images=total_images,
            total_eggs=0,
            total_hatched=0,
            date_updated=date,
            is_complete=False
        )

        # Read files into memory BEFORE starting thread (No images are saved at this point, only on memory)
        files_data = []
        for f in request.FILES.getlist('myfiles'):
            file_bytes = f.read()
            # Encode to base64 to send it to the compute server
            encoded = base64.b64encode(file_bytes).decode("utf-8")
            # Append json to array
            files_data.append({"name": f.name, "data": encoded})

        # Throw to thread and forget
        t = threading.Thread(target=process_images, args=(batch, files_data, header))
        t.start()
        # Send that upload was completed to the user, while thread is running.
        return JsonResponse({'message': "Upload received! Processing in background.", 'batch_id': batch.id})

    return render(request, "base.html", {'included_template': 'upload.html'})



# This is the server side for the scripts
# Sends it to the editor HTML.
def edit(request, image_id):
    # Get image entry
    image = get_object_or_404(ImageDetails, image_id=image_id)

    # Get related annotation points
    annotations = AnnotationPoints.objects.filter(image=image).values(
        "point_id", "x", "y"
    )

    return render(
        
        request,
        "base.html",
        {
            "included_template": "editor.html",
            "image_name": image.image_name,                # filename for <img>
            "points_json": json.dumps(list(annotations)),   # list of dicts for JS
            "total_eggs": json.dumps(image.total_eggs),
            "img_id" : json.dumps(image_id) 
        }
    )


# This is where user can see what was uploaded..
from django.shortcuts import render
from .models import BatchDetails, ImageDetails

def view(request):
    # Just show igcognito batches atm (Brute forced.)
    batches = BatchDetails.objects.filter(owner="incognito")

    # Might remove this..
    batches = batches.prefetch_related("imagedetails_set")

    return render(
        request,
        "base.html",
        {
            "included_template": "view.html",
            "batches": batches,
        }
    )

def batch_images(request, batch_id):
    images = ImageDetails.objects.filter(batch_id=batch_id).values(
        "image_id","image_name", "total_eggs", "img_type"
    )
    return JsonResponse(list(images), safe=False)

def add_egg_to_db(request, image_id):
    if request.method == "POST":
        try:
            
            data = json.loads(request.body.decode("utf-8"))
            print("DEBUG POST DATA:", data)  # 👈 see what came in
            x = data.get("x")
            y = data.get("y")

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
        try:
            data = json.loads(request.body.decode("utf-8"))
            print("DEBUG POST DATA:", data)

            x = data.get("x")
            y = data.get("y")

            # Try to get the point
            point = AnnotationPoints.objects.filter(image_id = image_id, x=x, y=y).first()

            if not point:
                return JsonResponse({"STATUS": "Point not found"}, status=404)

            if point.is_original:
                # mark as deleted instead of removing
                point.isDeleted = True
                point.save()
                return JsonResponse({"STATUS": "Marked as deleted"})
            else:
                # actually remove the row
                AnnotationPoints.objects.filter(x=x, y=y).delete()
                return JsonResponse({"STATUS": "Deleted"})

        except Exception as e:
            return JsonResponse({"STATUS": f"Error: {str(e)}"}, status=500)

    return JsonResponse({"STATUS": "Invalid request"}, status=400)
