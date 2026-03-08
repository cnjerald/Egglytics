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
import warnings

# Disable the DecompressionBombError and Warning
Image.MAX_IMAGE_PIXELS = None 

# Suppress the warning if it still appears in certain contexts
warnings.simplefilter('ignore', Image.DecompressionBombWarning)


def upload(request):
    """
    Handles file upload, stores metadata in the database, and launches background processing.

    Workflow:
    1. Validates that the request is POST and contains files.
    2. Creates a BatchDetails entry in the database.
    3. Encodes uploaded files in base64 and collects per-file metadata.
    4. Launches a separate thread to process images asynchronously.
    5. Returns a JSON response immediately confirming upload receipt.

    Args:
        request (HttpRequest): Django request object containing POST data and FILES.

    POST Parameters:
        batch_name (str): Name of the upload batch.
        user (str): Owner of the batch.
        myfiles (list[UploadedFile]): Uploaded image files.
        model_{i} (str): Model selected for the ith file.
        mode_{i} (str): Mode for the ith file, either 'micro' or 'macro'.
        share_{i} (str): Whether the file should be shared ('true'/'false').

    Returns:
        JsonResponse: If POST with files, returns a confirmation message and batch ID.
        HttpResponse: If not a POST or no files, renders the upload page.
    """
    if request.method == 'POST' and request.FILES.getlist('myfiles'):
        # Get the current time now, creating a unique key
        batch_name = request.POST.get("batch_name")
        owner = request.POST.get("user")

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
    """
    Recalibrates an uploaded image by processing it in a background thread.

    Workflow:
    1. Accepts a POST request with JSON payload containing imageId and averagePixels.
    2. Retrieves the image record from the database.
    3. Loads the image file from disk and encodes it as base64.
    4. Launches a background thread to perform recalibration using the specified model and mode.
    5. Returns a JSON response immediately.

    Args:
        request (HttpRequest): Django request object containing JSON body.

    JSON POST Parameters:
        imageId (str): Unique identifier of the image to recalibrate.
        averagePixels (float): Average pixel value used for recalibration.

    Returns:
        JsonResponse: 
            - {"status": "success"} if recalibration thread started successfully.
            - {"error": "Image not found"} with 404 status if image ID is invalid.
            - {"error": "<message>"} with 400 status for other errors.
            - {"error": "Invalid request"} with 405 status if request method is not POST.
    """
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
                image_obj.file_path      # filename from DB
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
    """
    Recalibrates a single image using the specified AI model, updates annotations,
    and saves a compressed version of the processed image to disk.

    Workflow:
    1. Retrieves the existing ImageDetails record from the database.
    2. Sends the image to the AI model for recalibration.
    3. Falls back to the original image if the AI fails.
    4. Updates annotation points in AnnotationPoints (deletes old, inserts new).
    5. Saves the processed image to MEDIA_ROOT/uploads with downsampling 
       (JPEG, quality=65) to reduce file size.
    6. Updates egg count and processing flags in the database.

    Args:
        image (str): Base64-encoded image string.
        avg_pixels (float): Average pixel value used for recalibration.
        model (str): Name of the AI model to use (e.g., "polyegg_heatmap").
        mode (str): Processing mode ("micro" or "macro").
        image_id (int): ID of the image record in the database.

    Returns:
        None

    Side Effects:
        - Updates ImageDetails record: total_eggs, is_processed, image_version.
        - Updates AnnotationPoints table with recalibrated points.
        - Saves processed image to MEDIA_ROOT/uploads in compressed JPEG format.
        - Updates parent BatchDetails with new total egg count.
    """

    payload = {
        "image": image,
        "avg_pixels": avg_pixels,
        "mode": mode
    }

    response = None
    data = None
    status_code = None

        # --------------- GET EXISTING IMAGE RECORD ---------------
    try:
        image_record = ImageDetails.objects.get(image_id=image_id)
    except ImageDetails.DoesNotExist:
        print("Image record missing during recalibration")
        return
    
    image_record.is_processed = False
    image_record.save()

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
    # Remove header if present
        if "," in image_b64:
            image_b64 = image_b64.split(",")[1]

        # Decode base64
        img_data = base64.b64decode(image_b64)

        # Open with Pillow
        image = Image.open(BytesIO(img_data))

        # Keep original resolution
        print("Resolution:", image.size)

        # Convert to RGB if needed (PNG with alpha → JPEG compatible)
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")

        # Prepare folder
        upload_dir = os.path.join(settings.MEDIA_ROOT, "uploads")
        os.makedirs(upload_dir, exist_ok=True)

        file_path = os.path.join(upload_dir, image_record.file_path)

        # SAVE WITH COMPRESSION (quality=75)
        image.save(
            file_path,
            format="JPEG",
            quality=75,       # slightly higher than 65
            optimize=True,
            progressive=True
        )

        print("Saved:", file_path)
        print("New size (KB):", os.path.getsize(file_path) / 1024)

    # --------------- UPDATE COUNTS ---------------
    image_record.total_eggs = egg_count
    image_record.is_processed = True
    image_record.image_version += 1
    image_record.save()

    print("Recalibration complete for image:", image_id)



                

    
# HELPER FUNCTION TO PROCESS IMAGES
def process_images(batch, files_data, header):
    """
    Processes a batch of uploaded images by sending them to the model for inference,
    saving results to the database, and writing processed images to disk.

    Workflow:
    1. Iterates through each uploaded file and creates a DB record.
    2. Sends the image to the specified model (e.g., 'polyegg_heatmap') or uses
       a fallback annotation method.
    3. Extracts results (egg counts, final image, annotation points) from the model response.
    4. Saves processed images locally with compression.
    5. Records annotation points in the database.
    6. Updates batch-level summary (total eggs, completion status, failure flag).

    Args:
        batch (BatchDetails): The database record representing this batch.
        files_data (list[dict]): List of dictionaries containing per-file metadata:
            - name (str): Original filename
            - data (str): Base64-encoded image
            - model (str): Model to use for processing
            - mode (str): "micro" or "macro"
            - share (bool): Whether to share results (optional)
        header (str): Prefix to use for generated filenames.

    Returns:
        None

    Side Effects:
        - Creates ImageDetails records for each file.
        - Writes processed images to MEDIA_ROOT/uploads.
        - Saves annotation points to AnnotationPoints table.
        - Updates BatchDetails with total eggs, completion status, and fail flags.
    """
    total_eggs = 0
    total_hatched = 0
    # bucket_name = "egglytics"

    for i, file_dict in enumerate(files_data, start=0):
        try:

            # Params:
            # File name (STRING) ->  The name of the file saved on media/uploads\
            # image_name (STRING) -> The name of the image 
            # encoded (STRING) -> Image in base64
            # mode (Binary STRING) -> If Micro or Macro
                # Force JPEG output (smaller)
            file_name = f"{header}_{uuid.uuid4().hex}"
            image_name = f"image_{file_name}.jpg"
            encoded = file_dict["data"]

            model = file_dict["model"]
            mode = file_dict["mode"]

            # Create DB record
            image_record = ImageDetails.objects.create(
                batch = batch,
                image_name = image_name,
                file_path = image_name,
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
                # Remove header if present
                if "," in image_b64:
                    image_b64 = image_b64.split(",")[1]

                # Decode base64
                img_data = base64.b64decode(image_b64)

                # Open with Pillow
                image = Image.open(BytesIO(img_data))

                # Keep original resolution
                print("Resolution:", image.size)

                # Convert to RGB if needed (PNG with alpha → JPEG compatible)
                if image.mode in ("RGBA", "P"):
                    image = image.convert("RGB")

                # Prepare folder
                upload_dir = os.path.join(settings.MEDIA_ROOT, "uploads")
                os.makedirs(upload_dir, exist_ok=True)

                file_path = os.path.join(upload_dir, image_name)

                # SAVE WITH COMPRESSION
                image.save(
                    file_path,
                    format="JPEG",
                    quality=75,       # sweet spot
                    optimize=True,
                    progressive=True
                )

                print("Saved:", file_path)
                print("New size (KB):", os.path.getsize(file_path) / 1024)

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