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



# This is the upload feature backend, it handles creating a cache of the image, 
# sending the image to the flask server and receiving the results from the flask server.
# This also updates the SQLite
def upload(request): 
    if request.method == 'POST' and request.FILES.getlist('myfiles'):
        header = datetime.now().strftime("%Y%m%d_%H%M%S")
        owner = request.user.username if request.user.is_authenticated else 'incognito'
        batch_name = f"{header}_{owner}"
        date = timezone.now()

        total_images = len(request.FILES.getlist('myfiles'))
        total_eggs = 0   # you’ll calculate this later
        total_hatched = 0

        # Create a batch row in db
        batch = BatchDetails.objects.create(
            batch_name=batch_name,
            owner=owner,
            total_images=total_images,
            total_eggs=total_eggs,
            total_hatched=total_hatched,
            date_updated=date
        )

        # Retrieve all uploaded images
        files = request.FILES.getlist('myfiles')
        # For each image
        for i, f in enumerate(files, start=0):
            file_name = f"{header}_{i}.jpg"

            # Uploading files for inference
            # Convert to base64
            file_bytes = f.read()
            encoded = base64.b64encode(file_bytes).decode('utf-8')
            payload = {'image': encoded, 'filename': f.name}
            try:
                # Send it to the compute server
                response = requests.post('http://localhost:5000/upload_base64', json=payload)
                data = response.json()  

                points = data.get("points")          # annotation data list
                image_b64 = data.get("final_image")  # final image as base64

                #Save ImageDetails in DB
                image_record = ImageDetails.objects.create(
                    batch=batch,                     # link to your BatchDetails object
                    image_name=f"image_{i}.jpg",     # give it a filename or UUID
                    total_eggs=0,                    # update later from model if needed
                    total_hatched=0,                 # update later from model if needed
                    img_type="MICRO",                # HARDCODED ATM
                    allow_collection=True
                )

                #Decode base64 and save locally (This will be saved in an S3 bucket in the future)
                if image_b64:
                    img_data = base64.b64decode(image_b64)
                    file_name = f"{image_record.image_name}"
                    upload_dir = os.path.join(settings.BASE_DIR, "egglytics", "static", "uploads")
                    os.makedirs(upload_dir, exist_ok=True)           # ensure directory exists
                    file_path = os.path.join(upload_dir, file_name)  # static/uploads/<filename>

                    with open(file_path, "wb") as f:
                        f.write(img_data)

                #Save point annotations linked to image to the annotation_point db
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


        return JsonResponse({'filenames': "GOOD!"}) # Ajax return to website if needed

    # GET request fallback
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
            "points_json": json.dumps(list(annotations))   # list of dicts for JS
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


