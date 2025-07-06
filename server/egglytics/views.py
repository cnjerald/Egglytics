from django.shortcuts import render
from django.http import JsonResponse
import cv2
import numpy as np

def upload(request): 
    file_names = []

    if request.method == 'POST' and request.FILES.getlist('myfiles'):
        files = request.FILES.getlist('myfiles')

        'This is just for debugging, remove it later'
        for f in files:
            file_names.append(f.name)
        print(file_names)

        for f in files:
            file_bytes = np.asarray(bytearray(f.read()),dtype=np.uint8)
            img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
            height, width = img.shape[:2]
            print(f"Width: {width}, Height: {height}")

        return JsonResponse({'filenames': file_names}) # Ajax return

    # GET request fallback
    return render(request, "base.html", {'included_template': 'upload.html'})


def edit(request):
    return render(request, "base.html", {'included_template': 'test2.html'})