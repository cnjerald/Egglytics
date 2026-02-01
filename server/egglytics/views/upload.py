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
        t = threading.Thread(
                target=process_images,
                args=(batch, files_data, batch_name)
            )
        t.start()
        # Send that upload was completed to the user, while thread is running.
        return JsonResponse({'message': "Upload received! Processing in background.", 'batch_id': batch.id})

    return render(request, "base.html", {'included_template': 'upload.html'})
def recalibrate(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            image_id = data.get("imageId")
            avg_pixels = data.get("averagePixels")

            print("Image ID:", image_id)
            print("Average Pixels:", avg_pixels)

            # Get image record
            image_obj = ImageDetails.objects.get(image_id=image_id)

            image_path = os.path.join(
                settings.MEDIA_ROOT,      # /full/system/path/media
                "uploads",                # your folder
                image_obj.image_name      # filename from DB
            )

            model = image_obj.model_used
            mode = "macro"

            print("Resolved path:", image_path)

            # Load image as base64
            with open(image_path, "rb") as f:
                image_bytes = f.read()
                image_base64 = base64.b64encode(image_bytes).decode("utf-8")

            print("Image loaded. Size:", len(image_base64))

            # Throw to thread and forget
            t = threading.Thread(
                    target=recalibrate_image,
                    args=(image_base64,avg_pixels,model,mode,image_id)
                )
            t.start()
            return JsonResponse({"status": "success"})

        except ImageDetails.DoesNotExist:
            return JsonResponse({"error": "Image not found"}, status=404)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Invalid request"}, status=405)

def recalibrate_image(image, avg_pixels, model, mode, image_id):
    payload = {
        "image": image,
        "avg_pixels": avg_pixels,
        "mode": mode
    }

    response = None
    data = None
    status_code = None

    # ---------------- AI CALL ----------------
    try:
        match model:
            case "polyegg_heatmap":
                response = requests.post(
                    "http://127.0.0.1:5000/recalibrate_base64",
                    json=payload,
                    timeout=300
                )
                status_code = response.status_code
                print("Flask raw:", response.text[:300])
                data = response.json()

            case "RESERVED_":
                print("RESERVED")
                return

    except Exception as e:
        print("Flask request failed:", e)
        return

    # --------------- FAIL SAFE ---------------
    if status_code != 200 or data.get("status") != "complete":
        print("AI failed, using fallback")
        data = {
            "status": "complete",
            "points": [],
            "final_image": image,
            "egg_count": 0
        }

    # --------------- EXTRACT DATA ---------------
    points = data.get("points", [])
    image_b64 = data.get("final_image")
    egg_count = data.get("egg_count", 0)

    print(f"[Recalibrate] Points: {len(points)}, Eggs: {egg_count}")

    # --------------- GET EXISTING IMAGE RECORD ---------------
    try:
        image_record = ImageDetails.objects.get(image_id=image_id)
    except ImageDetails.DoesNotExist:
        print("Image record missing during recalibration")
        return
    
    # ------------- GET BATCH ID FROM IMAGE RECORD
    batch = image_record.batch
    batch.total_eggs = max(0, batch.total_eggs - image_record.total_eggs + egg_count)
    batch.save()

    # --------------- PURGE OLD ANNOTATIONS ---------------
    AnnotationPoints.objects.filter(image=image_record).delete()
    print("Old annotations deleted")

    # --------------- INSERT NEW ANNOTATIONS ---------------
    for p in points:
        AnnotationPoints.objects.create(
            image=image_record,
            x=p[0],
            y=p[1],
            is_original=True # recalibrated result remains true since it is the machine predictions..
        )

    print("New annotations saved")

    # --------------- UPDATE IMAGE FILE ---------------
    if image_b64:
        img_data = base64.b64decode(image_b64)
        upload_dir = os.path.join(settings.MEDIA_ROOT, "uploads")
        os.makedirs(upload_dir, exist_ok=True)

        file_path = os.path.join(upload_dir, image_record.image_name)

        with open(file_path, "wb") as f_out:
            f_out.write(img_data)

        print("Image file replaced")

    # --------------- UPDATE COUNTS ---------------
    image_record.total_eggs = egg_count
    image_record.is_processed = True
    image_record.image_version += 1
    image_record.save()

    print("Recalibration complete for image:", image_id)



                

    
# HELPER FUNCTION TO PROCESS IMAGES
def process_images(batch, files_data, header):
    total_eggs = 0
    total_hatched = 0
    # bucket_name = "egglytics"

    for i, file_dict in enumerate(files_data, start=0):
        try:

            # Params:
            # File name (STRING) ->  The name of the file saved on media/uploads\
            # image_name (STRING) -> The name of the image (NOTE TO JERALD PLS CHANGE THIS SO USER CAN RENAME FILES IN FUTURE)
            # encoded (STRING) -> Image in base64
            # mode (Binary STRING) -> If Micro or Macro
            file_name = f"{header}_{i}"
            image_name = f"image_{file_name}.jpg"
            encoded = file_dict["data"]

            model = file_dict["model"]
            mode = file_dict["mode"]

            # Create DB record
            image_record = ImageDetails.objects.create(
                batch = batch,
                image_name = image_name,
                total_eggs = 0,
                total_hatched = 0,
                img_type = mode,
                is_processed = False,
                is_validated = False,
                model_used = model
            )

            payload = {'image': encoded,'mode': mode}

            response = None
            data = None
            status_code = None

            match model:
                case "polyegg_heatmap":
                    response = requests.post(
                        "http://127.0.0.1:5000/upload_base64",
                        json=payload,
                        timeout=300
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
            # Just put has fail present if something goes wrong
            if status_code != 200 or data.get("status") != "complete":
                batch.has_fail_present = True
                data = {
                    "status": "complete",
                    "points": [],
                    "final_image": encoded,
                    "egg_count": 0
                }

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