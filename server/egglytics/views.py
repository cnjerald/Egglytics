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
import boto3
from PIL import Image
import io

# from dotenv import load_dotenv
# load_dotenv()
# Uncomment to save to S3 S3 bucket address
# s3 = boto3.client(
#     "s3",
#     aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
#     aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
#     region_name=os.getenv("AWS_DEFAULT_REGION", "ap-southeast-1")
# )

def process_images(batch, files_data, header):
    total_eggs = 0
    total_hatched = 0
    bucket_name = "egglytics"

    for i, file_dict in enumerate(files_data, start=0):
        try:
            file_name = f"{header}_{i}"
            image_name = f"image_{file_name}.jpg"
            encoded = file_dict["data"]
            original_name = file_dict["name"]



            # # Upload original image to S3
            # #Decode and upload original image to S3
            # image_data = file_dict["data"]
            # image_bytes = base64.b64decode(image_data)
            # image = Image.open(io.BytesIO(image_bytes))

            # buffer = io.BytesIO()
            # image.save(buffer, format="JPEG")
            # buffer.seek(0)
            # s3_key = f"temp/{image_name}"
            # s3.upload_fileobj(buffer, bucket_name, s3_key)
            # print(f" Uploaded {image_name} to S3 bucket {bucket_name}/{s3_key}")

            # Create DB record
            image_record = ImageDetails.objects.create(
                batch=batch,
                image_name=image_name,
                total_eggs=0,
                total_hatched=0,
                img_type="MICRO",
                allow_collection=True,
                is_processed=False,
            )

            encoded = file_dict["data"]
            original_name = file_dict["name"]

            payload = {'image': encoded, 'filename': original_name}

            # # Send to compute server
            # payload = {
            #     "file_name": image_name,
            #     "s3_path": s3_key,
            # }
            response = requests.post("http://127.0.0.1:5000/upload_base64", json=payload)
            data = response.json()

            # Extract result data
            if response.status_code != 200 or data.get("status") != "complete":
                # Case here that the comptue server failed..
                print(" Compute server failed:", data)
                batch.has_fail_present = True
                continue

            points = data.get("points", [])
            image_b64 = data.get("final_image")
            temp_eggs = data.get("egg_count", 0)
            
            total_eggs += temp_eggs
            image_record.total_eggs = temp_eggs
            image_record.is_processed = True
            image_record.save()
            
            if image_b64:
                img_data = base64.b64decode(image_b64)
                upload_dir = os.path.join(settings.BASE_DIR, "egglytics", "static", "uploads")
                os.makedirs(upload_dir, exist_ok=True)
                file_path = os.path.join(upload_dir, image_record.image_name)
                with open(file_path, "wb") as f_out:
                    f_out.write(img_data)

            #  Download processed image from S3
            #s3_output_path = data.get("s3_output_path")  # processed image path
            # if s3_output_path:
            #     local_upload_dir = os.path.join(settings.BASE_DIR, "egglytics", "static", "uploads")
            #     os.makedirs(local_upload_dir, exist_ok=True)
            #     local_file_path = os.path.join(local_upload_dir, image_record.image_name)

            #     with open(local_file_path, "wb") as f_out:
            #         s3.download_fileobj(bucket_name, s3_output_path, f_out)

            #     print(f" Downloaded processed image to {local_file_path}")

            #  Save annotation points to DB
            if points:
                print(f"[DEBUGGER] Saving {len(points)} annotation points...")
                for p in points:
                    AnnotationPoints.objects.create(
                        image=image_record,
                        x=p[0],
                        y=p[1],
                        is_original=True
                    )

        except Exception as e:
            batch.has_fail_present = True
            print("Error while processing image:", e)

    # Update batch summary
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
            is_complete=False,
            has_fail_present=False
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
        t = threading.Thread(target=process_images, args=(batch, files_data, batch_name))
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
    annotations = AnnotationPoints.objects.filter(image=image, is_deleted = False).values(
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
        }
    )


def batch_images(request, batch_id):
    images = ImageDetails.objects.filter(batch_id=batch_id).values(
        "image_id","image_name", "total_eggs", "img_type"
    )
    return JsonResponse(list(images), safe=False)

def batch_status(request):
    batches = BatchDetails.objects.filter(owner="incognito").values(
        "id", "total_eggs", "total_images", "is_complete","has_fail_present"
    )
    return JsonResponse(list(batches), safe=False)

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
