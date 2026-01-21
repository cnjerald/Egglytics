#
#
# This is where the image is initially send after clicking the submit button in the upload.html.
# It basically saves the image on the backend, then fires a redirect to the user to the view page once saved.
# To do this, it creates a separate thread on compute such that the user does not need to wait for the images
# To be processed, only uploaded to the server.
#
#
#

from ._imports import *

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
            has_fail_present=False,
        )

        # Read files into memory BEFORE starting thread (No images are saved at this point, only on memory)
        files = request.FILES.getlist("myfiles")
        files_data = [] # Store as Array of JSON
        for i, f in enumerate(files):
            file_bytes = f.read()
            encoded = base64.b64encode(file_bytes).decode("utf-8")

            # Retrieve per-file metadata
            model = request.POST.get(f"model_{i}")
            mode = request.POST.get(f"mode_{i}")          # "micro" or "macro"
            share = request.POST.get(f"share_{i}") == "true"

            files_data.append({
                "name": f.name,
                "data": encoded,
                "model": model,
                "mode": mode,
                "share": share,
            })

        # Throw to thread and forget
        t = t = threading.Thread(
                target=process_images,
                args=(batch, files_data, batch_name)
            )
        t.start()
        # Send that upload was completed to the user, while thread is running.
        return JsonResponse({'message': "Upload received! Processing in background.", 'batch_id': batch.id})

    return render(request, "base.html", {'included_template': 'upload.html'})

# HELPER FUNCTION TO PROCESS IMAGES
def process_images(batch, files_data, header):
    total_eggs = 0
    total_hatched = 0
    # bucket_name = "egglytics"

    for i, file_dict in enumerate(files_data, start=0):
        try:
            file_name = f"{header}_{i}"
            image_name = f"image_{file_name}.jpg"
            encoded = file_dict["data"]
            original_name = file_dict["name"]
            allow_sharing = file_dict["share"]
            model = file_dict["model"]
            mode = file_dict["mode"]

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
                batch = batch,
                image_name = image_name,
                total_eggs = 0,
                total_hatched = 0,
                img_type = mode,
                allow_collection = allow_sharing,
                is_processed = False,
                is_validated = False,
                model_used = model
            )

            encoded = file_dict["data"]
            original_name = file_dict["name"]

            payload = {'image': encoded, 'filename': original_name}

            # # Send to compute server
            # payload = {
            #     "file_name": image_name,
            #     "s3_path": s3_key,
            # }

            # 
            response = None
            data = None
            status_code = None

            match model:
                case "polyegg_heatmap":
                    response = requests.post(
                        "http://127.0.0.1:5000/upload_base64",
                        json=payload,
                        timeout=30
                    )
                    data = response.json()
                    status_code = response.status_code

                case "free_annotate":
                    data = {
                        "status": "complete",
                        "points": [],
                        "final_image": encoded,
                        "egg_count": 0
                    }
                    status_code = 200

            # Extract result data
            if status_code != 200 or data.get("status") != "complete":
                print("Compute server failed:", data)
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
                upload_dir = os.path.join(settings.MEDIA_ROOT, "uploads")
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