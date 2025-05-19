import base64
import cv2 as cv
import numpy as np
from flask import Flask, request
from flask_cors import CORS

# If you are using windows, GUNICORN WILL NOT WORK.
# TEST ON LOCALHOST INSTEAD
# Four CORES, LOCALHOST, PORT 8000.
# gunicorn -w 4 -b 127.0.0.1:8000 app:app

# MAC AND LINUX GUNICORN WILL WORK.


app = Flask(__name__)
CORS(app)

# This function is a modification of the reply of Philip Ciunkiewicz and Javier Vallejos taken from
# https://stackoverflow.com/questions/33754935/read-a-base-64-encoded-image-from-memory-using-opencv-python-library
# This lets cv2 read from a buffer by decoding a base64 input image.
def readb64(uri):
    if ',' in uri:
        encoded_data = uri.split(',')[1]
    else:
        encoded_data = uri
    
    nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
    img = cv.imdecode(nparr, cv.IMREAD_COLOR)
    return img


@app.route('/upload_base64', methods=['POST'])
def upload_base64():
    data = request.get_json()

    if not data or 'image' not in data:
        return {'error': 'No image data provided'}, 400

    image_data = data['image']

    print(f"Received image data length: {len(image_data)}")  # Log length of the Base64 string
    try:
        image = readb64(image_data)
    except Exception as e:
        return {'error': f'Error decoding image: {str(e)}'}, 400
    
    # This is just for debugging to see if something is recieved or not.
    height, width, _ = image.shape

    print(f"Height: {height} pixels")
    print(f"Width: {width} pixels")
    
    return {"status" : "complete"}, 200


# python app.py
"""
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
"""