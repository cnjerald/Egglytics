# Egglytics
<p align="center">
<img src="assets/demo.jpg" alt="Banner" width = "100%" style="max-height: 200px">
</p>

<br>

## What is Egglytics?
Egglytics is a web application developed under the Center for Computer Vision Laboratory of De Lasalle University, which is partnered with the Biological Control Department to assist in counting mosquito eggs. Its core feature lets users review and modify annotation results produced by a UNet model from the PolyEgg study for automated detection. This ability to edit annotations creates a feedback loop that extends the study, by generating corrected data for retraining and improving the model. 

## Project Structure
Egglytics is composed of two main systems: the Django web application and a separate compute server for model inference.

```text
Egglytics/
├── README.md                          # Main project documentation
├── requirements.txt                   # Python dependencies
├── assets/                            # Project assets (images, demos)
│   ├── demo.jpg
│   ├── upload.jpg
│   ├── view.jpg
│   ├── view_specific.jpg
│   └── annotate.jpg
│
├── server/                            # Django Web Application
│   ├── manage.py                      # Django entry point
│   ├── run_waitress.py               # Production server runner
│   ├── stash_diff.patch              # Git patch file
│
│   ├── server/                        # Django project configuration
│   │   ├── settings.py               # Settings (DB, middleware, apps)
│   │   ├── urls.py                   # Root URL routing
│   │   ├── wsgi.py                   # WSGI config
│   │   └── asgi.py                   # ASGI config
│
│   ├── egglytics/                     # Main Django application
│   │   ├── views/                    # Backend logic (upload, editor, view, metrics)
│   │   ├── templates/                # HTML templates (UI pages)
│   │   ├── static/                   # Frontend assets (JS, CSS, images)
│   │   ├── migrations/               # Database migrations
│   │   ├── models.py                 # Database models
│   │   └── urls.py                   # App routes
│   │
│   └── media/                        # Uploaded files and outputs
│
└── compute/                          # ML Model Server (separate service)
    ├── app.py                        # Flask API for inference
    └── model_weights/               # Trained models (U-Net, etc.)
```

## Dependencies

This project uses a combination of backend (Python), frontend (CDN-based JS libraries), and external services.

---

## Backend Dependencies (Python)

| Library | Purpose |
|----------|--------|
| Django | Web framework and ORM for the application |
| python-decouple | Environment variable management (.env handling) |
| psycopg2 | PostgreSQL database connector |
| opencv-python | Image processing and computer vision tasks |
| numpy | Numerical computations for ML processing |
| pillow | Image manipulation and processing |
| requests | HTTP communication with compute server |
| whitenoise | Static file serving in production |
| waitress | Production WSGI server |

---

## Frontend Dependencies (CDN Libraries)

| Library | Purpose |
|----------|--------|
| jQuery 3.6.0 | DOM manipulation and AJAX requests |
| OpenSeadragon 4.1.0 | High-resolution image viewer |
| CropperJS 1.5.13 | Image cropping functionality |
| Font Awesome 6.4.0 | UI icons |

---

## External System

**Compute Server (Flask/Python)**  
- URL: http://127.0.0.1:5000  
- Handles ML inference using U-Net models  
- Returns:
  - annotations (points / rectangles / polygons)  
  - egg count  
  - processed image  

---

## System Requirements

- Python 3.8+
- PostgreSQL 12+
- Django 4.x compatible environment

## System Architecture Overview

Egglytics follows a **client–server–compute architecture** designed to separate the web interface, backend logic, and machine learning inference system.

The system is divided into three main components:

---

### 1. Frontend (Client Side)
The frontend is built using **HTML, CSS, and Vanilla JavaScript** inside Django templates.

It handles:
- Image upload interface
- Annotation editor (points, rectangles, polygons)
- Batch viewing and filtering
- User interactions (click, drag, draw, edit)

Key modules:
- `image_upload_handler.js` → handles file uploads and model selection
- `image_editor_handler.js` → manages annotation tools and viewer interactions
- `view_functions_handler.js` → handles batch viewing, sorting, and filtering

The frontend communicates with the backend using **AJAX (jQuery)** requests.

---

### 2. Backend (Django Server)
The backend is responsible for:
- Request handling and routing
- Database operations (PostgreSQL via Django ORM)
- Managing batches, images, and annotations
- Coordinating communication with the compute server

Key components:
- `upload.py` → handles image upload and batch creation
- `editor.py` → saves and updates annotations
- `view.py` → retrieves batch/image data
- `metrics.py` → computes and displays model performance
- `export.py` → handles data export functionality

The backend acts as the **central controller** between the frontend and compute server.

---

### 3. Compute Server (ML Inference System)
The compute server is a separate **Flask-based service** responsible for running the U-Net model inference.

It handles:
- Receiving encoded images from Django backend
- Running ML model prediction (U-Net or custom models)
- Generating annotations (points, rectangles, polygons)
- Returning processed results

Example endpoint:
```
POST http://127.0.0.1:5000/my_method_name
```

Response includes:
- `final_image` (processed image)
- `egg_count` (detected eggs)
- `annotations` (points / rectangles / polygons)

---

## System Data Flow

### 1. Upload Workflow
```
User Uploads Image
    ↓
Frontend (UploadHandler.js)
    ↓
Django Backend (upload.py)
    ↓
Compute Server (ML Inference)
    ↓
Returns Predictions
    ↓
Stored in PostgreSQL Database
    ↓
Displayed in View Interface
```

---

### 2. Annotation Workflow
```
User Opens Editor
    ↓
Frontend loads image (OpenSeadragon)
    ↓
User adds/modifies annotations
    ↓
AJAX request sent to Django backend
    ↓
editor.py updates database
    ↓
PostgreSQL stores annotations
```

---

### 3. Viewing & Filtering Workflow
```
User opens View Page
    ↓
Frontend requests batch data
    ↓
view.py queries database
    ↓
Backend returns filtered results
    ↓
Frontend renders table + UI updates
```

---

## Key Design Principle

Egglytics is designed with **separation of concerns**:

- **Frontend** → User interaction and visualization  
- **Backend (Django)** → Data management and API logic  
- **Compute Server** → Machine learning inference  

This separation allows:
- Easier model upgrades without touching UI
- Independent scaling of ML processing
- Cleaner and modular codebase structure

## Interfaces of the application

<p align="center">
<h1 align = "center"> Upload Interface </h1>
<h3 align = "center" >
  On this page, the user can upload images, select the image type, edit images, and choose a model for processing.
</h2>
<img src="assets/upload.jpg" alt="Banner" width = "100%">
</p>




<p align="center">
<h1 align = "center"> View Results </h1>
<h3 align="center">
  On this page, the user can view and filter batches. Users can also edit the batch name, update the number of hatched eggs, and view the details of each individual image.
</h3>
<img src="assets/view.jpg" alt="Banner" width = "100%">
<img src="assets/view_specific.jpg" alt="Banner" width = "100%">
</p>


<p align="center">
<h1 align = "center"> Editor Interface </h1>
<h3 align="center">
    On this page, users can edit and review the annotations. If the annotations seem incorrect, users may recalibrate them.
</h3>
<img src="assets/annotate.jpg" alt="Banner" width = "100%">
</p>

## Summary Table Of Results

| Evaluator   | Macro Sample Size | Macro MAPE (%) ↓        | Macro Speed (Egg/s) ↑        | Micro Sample Size | Micro MAPE (%) ↓        | Micro Speed (Egg/s) ↑        |
|------------|------------------|--------------------------|-------------------------------|-------------------|--------------------------|-------------------------------|
| 30 Humans  | 12               | 30.87                    | 1.67                          | 6                 | 4.09¹                    | 2.14                          |
| EggCountAI | 12               | 64.8                     | 3.39                          | 6                 | 9.51                     | 11.93                         |
| MecVision  | 12               | 81.18                    | 88.45                         | 6                 | 38.04                    | 41.73                         |
| Egglytics  | 12               | 5.25¹                    | 315.42²                       | 6                 | 5.23                     | 573.25²                       |

¹ Lowest MAPE (best accuracy)  
² Highest speed (best performance)

## Links to trained weights
Current Model Weights is not yet publicly available.

## Comparison Table Against Other Applications

<div align="center">

| Application Name | Method | Requires Manual Configuration | Open Source | Platform |
| :---: | :-: | :-: | :-: | :-------: |
| MECVision | Traditional Image Processing | No | Yes | Web
| Ovitrap Monitor | Traditional Image Processing | Yes | Yes | Web
| ICount | Unspecified Deep Learning Model | Yes | Yes | Windows
| EggCountAI | R-CNN | Yes | Yes | Windows
| **Egglytics** | **U-Net** | **No** | **Yes** | **Web** |

</div>

## For Developers
## I. Installation of Requirements
1. Install [Postgres](https://www.postgresql.org/download/)
2. Create a Virtual Environment (VENV) on a folder (Root) using "python -m venv ENV_NAME_HERE"
3. Activate VENV "ENV_NAME_HERE\Scripts\activate.bat"
4. On folder (Root) clone repository 
2. Activate Venv and install requirements using "pip install -r requirements.txt" for both web application and compute server

## II. Initial Database Setup
1. Login to postres using Shell "psql -U posgres"
2. Create a database using "CREATE DATABASE egglytics;"
3. Check if the database is created using "\l"

## III. Initial env setup
1. Create a .env file on ROOT of web application folder
2. In this .env file add these lines

SECRET_KEY="YOUR_KEY"

DB_NAME='egglytics'

DB_USER='postgres'

DB_PASSWORD='YOUR_POSTGRES_PASSWORD'

DB_HOST='localhost'

DB_PORT='5432'

3. On SHELL go to ROOT directory of the webapplication and activate venv
4. Change directory to server "cd server"
5. Create the tables in the database using "python manage.py migrate"
6. To test for creation success in the Postgres shell connect to the database "\c egglytics"
7. Check if the tables are there using "\d"
   
### IV. Running the Web Application (First time Startup)
1. On SHELL go to ROOT directory and activate venv
2. Change directory to server "cd server"
3. Initialize the tables in the database using "python manage.py makemigrations" and "python manage.py migrate"

### IV. Running the Web Application Test Server
1. Run the server using "python manage.py runserver"
2. Access website on Localhost port 8000 (http://127.0.0.1:8000/)

### IV. Running the Web Application Deployment (Waitress)
0. To configure Waitress settings (Threads & Port) see [server/run_waitress.py]
1. Run the server using "waitress-serve --port=8000 server.wsgi:application"
2. Access website on Localhost port 8000 (http://127.0.0.1:8000/)

### V. Running the Compute Test Server
1. On SHELL go to ROOT directory and activate venv
2. python app.py

### VI. Running the Compute Deployment Server
0. To configure docker settings (Threads, Timeout, Port) see \Dockerfile.
1. Build docker container using "docker build -t egglytics-app ."
2. Run built container using "docker run -p 8080:8080 egglytics-app"

## VII. Deploying Your Own Model
<h2 align="center">1. Adding a New Model on Front-end</h2>

```
server
└── egglytics
    └── static
        └── js
            ├── image_upload
            │   ├── ModelConfig.js   [1]
            │   └── TableHandler.js [2]
            │   └── UploadHandler.js [3]
```

You may follow this walkthrough in implementing **"my_model"**, or add your own model in **ModelConfig.js [1]** `MODELS` array.

```javascript
// Parameters:
// value - Used by the back-end
// label - Displayed to the user in the front-end

// The default selected label (Front-end) is the first item in the array.
static MODELS = [
  { value: "foo", label: "bar" },
  { value: "foo1", label: "bar1" },
  { value: "my_model", label: "Sample_model" }
]
```

<hr>
<h2 align="center">1.1 Files involved in loading these models </h2> 
<h5 align="center"> <strong> (Skip this if you didn't add additional parameters) <strong> </h5>

<h2> TableHandler.js [2] </h2>

```javascript
createModelCell(index) {
    *..
    this.models.forEach((model) => {
        const option = document.createElement("option");
        // Add your new paramaters here
        option.value = model.value;
        option.textContent = model.label;
        // [SAMPLE]
        //option.mynewparam = model.mynewparam;
        modelSelect.appendChild(option);
    });
    ..*
}
```
<h2> image_upload_handler.js [4] </h2>

```javascript
function loadModels() {
    *..
    models.forEach(model => {
        $allModel.append(
            $("<option>", {
                value: model.value,
                text: model.label
                // [SAMPLE]
                //option.mynewparam = model.mynewparam;
            })
        );
    });
    ..*
}
```

<h2 align="center"> 2. Sending details to server </h2>

```
├───egglytics
│   └── static
│   │   └── js
│   │       ├── image_upload
│   │       │   ├── UploadHandler.js [1]
│   ├───views
│   │   │   upload.py [2]
|   ├───urls.py[3]
```

<h3 align="center"> UploadHandler.js[1] sends an upload request to the server (JS to Python) </h3>

<h2> UploadHandler.js[1] </h2>

```javascript
async submitUpload() {
    ...

    return new Promise((resolve, reject) => {
        $.ajax({
            // URL route defined in urls.py [3]
            url: "/",
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            ...
        });
    });

    ...
}
```

<h3 align="center">urls.py[3] Routes the request to upload.py[2]</h3>

<h2> urls.py[3] </h2>

```python
from .views import upload

# This is the default route used to handle all uploads. Requests sent to "/" are handled by upload.py [2]
path("", upload.upload, name="upload"),
```

<h2> upload.py[2] </h2>

```python
def process_images(batch, files_data, header):
    *..
    for i, file_dict in enumerate(files_data, start=0):
        try:
            ...
            ## Your Model (This is @Param "value" in ModelConfig.js)
            model = file_dict["model"]
        
            ## You might need this if you have micro/macro pipelines.
            mode = file_dict["mode"]

            ...
            ## Default payload
            payload = {'image': encoded,'mode': mode}
            ...

            match model:
                case "polyegg_heatmap":
                    ...
                case "free_annotate":
                    ...
                # Note here that in the CASE statement "my_model" is the "value" 
                # parameter in your MODELS array in ModelConfig.js.
                # Ensure that the ip address, port, and method name matches on your compute server. 
                # Try block is used here since if the server is closed, 
                # the an error will occur even before reaching the status_code.
                case "my_model":
                    try:
                        response = requests.post(
                            "http://127.0.0.1:5000/my_method_name",
                            json=payload,
                            timeout=300
                        )
                        data = response.json()
                        status_code = response.status_code
                    except requests.exceptions.RequestException as e:
                        ...
            ...
  ...
```

<h2 align="center"> 3. Compute Server Processing and Return of Data </h2>

```
├───compute
    └── app.py [1]
    └── model_weights [2]
```

<h3 align="center"> 3.1 Adding your own model </h2>
    Add your model in the model_weights[2] folder, by default ONNX model is used.
    Then you can pre-load your own model by editing these lines

```
    # model_path = "model_weights/my_new_model.onnx"
    # your_model_here = UNetONNXPredictor(model_path)
```

<h3 align="center"> 3.2 Receiving an image from the webapp </h2>

The demo in app.py[1] "my_new_method" function returns one annotation type at random (Points,rectangles,and polygons), the image returned here is a grayscale image.   

```python

    #syntax: @app.route('@Param method:String',methods=['POST'])
    # Ensure that @Param method matches the one placed in upload.py

@app.route('/my_method_name', methods=['POST'])
def my_new_method():
    data = request.get_json()
    if not data or 'image' not in data:
        return {'status': 'failed', 'error': 'No image data provided', 'code': 1001}, 400
    
    # @Param image:type(numpyArray)
    # This is the image loaded in cv2 in BGR format.
    image = readb64(data['image'])

    # @Param node:type(String)
    # This is the mode selected (micro/macro) in String
    mode = data.get("mode") or ""

    # Chapter: Preprocessing
    # Sample code Grayscale image
    image_gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Chapter: Inference (Assuming that image_gray is the required input of the model)
    # See model.py for more details
    # @function predict(img, batch_size) returns numpyArray
    
    outputs = your_model_here.predict(image_gray,2)
    
    # Chapter: Post Processing
    # Sample code that returns points
    # Returns: list[tuple[int, int]] 
    # sample:[(x1,y1),(x2,y2),(x3,y3), ...]
    def findPoints():
        return [
            (1,1),
            (6,6),
            (9,9)
            ]
        
    # Sample code that returns rects (Pascal Format)
    # returns: list[list[int]] 
    # sample: [[x1, y1, x2, y2], [x1, y1, x2, y2], ...]
    def findRects():
        return [
            [1,1,2,2],
            [3,3,4,4]
            ]
    
    #Sample code that returns polygons
    # Returns: list[list[list[int]]] 
    # sample [[ [x1,y1], [x2,y2], ... ], ...]
    def findPolygons():
        return[
            [[1,1],[2,2],[0,2]],
            [[8,6],[9,2],[9,5]]
            ]
    
    # This is just an example, what it does is it gets random annotations among the three.
    # I assumed that each model only returns one type.
    import random
    detectors = {
        "points": findPoints,
        "rectangles": findRects,
        "polygons": findPolygons
    }

    dtype, func = random.choice(list(detectors.items()))
    detections = func()

    # Chapter: Returning Payload
    img_to_send = back_to_base64(image_gray)
    egg_count = len(detections)


    # This is where the compute server send back the results to the webapp.
    # Create payload form
    # Your payload MUST HAVE 
    # @Param status: type(BooleanString) <failed,complete> 
    # @Param final_image: type(base64String) 
    # @Param egg_count: type(int) 
    
    # Your payload SHOULD HAVE AT LEAST ONE 

    # @param points: list[tuple[int, int]] 
    # individual points [(x1,y1),(x2,y2),(x3,y3), ...] 

    # @param rectangles: list[list[int]] 
    # [[x1, y1, x2, y2], [x1, y1, x2, y2], ...] 

    # @param polygons: list[list[list[int]]] 
    # [[ [x1,y1], [x2,y2], ... ], ...]

    payload = {
        "status": "complete",
        "final_image": img_to_send,
        "egg_count": egg_count,
        # Usually those the selected annotation is placed here.
        # ex.
        # "points": detections
    }

    # Usually this part is already included on the payload above,
    # But since this is a demo of random annotations, we only select which one we used.

    # Insert the correct detection type
    if dtype == "points":
        payload["points"] = [(int(x), int(y)) for x, y in detections]

    elif dtype == "rectangles":
        payload["rectangles"] = detections

    elif dtype == "polygons":
        payload["polygons"] = detections


    # Actually send the payload pack
    return payload, 200

```

### VIII. For other concerns
Please Contact me at cnjerald@gmail.com for related concerns/bugs. 
Thank You.

