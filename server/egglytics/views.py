from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.conf import settings
from django.core.files.storage import FileSystemStorage
import json
import cv2
import numpy as np
import base64
import requests
import tempfile
import os
from .models import ImageEntry  # Delete in the future, not using SQLite on deployment...
import json



# This is the upload feature backend, it handles creating a cache of the image, 
# sending the image to the flask server and receiving the results from the flask server.
# This also updates the SQLite
def upload(request): 

    owner = request.user if request.user.is_authenticated else None
    print("The owner is!",owner)

    temp_dir = os.path.join(settings.BASE_DIR, 'temp_uploads')
    os.makedirs(temp_dir, exist_ok=True)
    temp_storage = FileSystemStorage(location=temp_dir)
    temp_files = request.session.get('temp_files', [])

    file_names = []

    if request.method == 'POST' and request.FILES.getlist('myfiles'):
        files = request.FILES.getlist('myfiles')
        index = 0
        
        # For each image
        for f in files:

            # Save images to temp folder
            # Save to temp folder
            filename = temp_storage.save(f.name, f)
            file_path = temp_storage.path(filename)
            temp_files.append(file_path)

            # Insert into SQLite
            ImageEntry.objects.create(filename=f.name, annotations="")

            # Upload images to Flask server for inference
            file_bytes = f.read()
            encoded = base64.b64encode(file_bytes).decode('utf-8')
            payload = {'image': encoded, 'filename': f.name}

            try:
                response = requests.post('http://localhost:5000/upload_base64', json=payload)
                data = response .json()  # Convert JSON response to Python dict
                points = data.get("points")  # This is the annotation data

                filename = f.name

                # Update the record in DB
                ImageEntry.objects.filter(filename=filename).update(annotations=points)



            except Exception as e:
                print(f"Error sending to Flask for {f.name}: {e}")


        return JsonResponse({'filenames': file_names}) # Ajax return

    # GET request fallback
    return render(request, "base.html", {'included_template': 'upload.html'})



# This is a brute force implementation to retrive the annotations of the first upload (ID=1) and
# Sends it to the editor HTML.
def edit(request):
    # Fetch entry by ID (change this if you want dynamic IDs from query params)
    entry_id = 1
    #entry = get_object_or_404(ImageEntry, id=entry_id)

    # Parse annotations safely
    #points = entry.annotations
    #print(points)
    '''
    if isinstance(points, str):
        try:
            points = json.loads(points)
        except json.JSONDecodeError:
            points = []
    '''
    return render(
        request,
        "base.html",
        {
            'included_template': 'editor.html',
            #'points_json': json.dumps(points)  # Send points to HTML
        }
    )

# This is where user can see what was uploaded..
def view(requests):
    return render(
        requests,
        "base.html",{
            'included_template' : 'view.html'
        }
    )

