# Egglytics
<p align="center">
<img src="assets/demo.jpg" alt="Banner" width = "100%" style="max-height: 200px">
</p>

<br>

## What is Egglytics?
Egglytics is a web application for counting mosquito eggs. Its core feature lets users review and modify annotation results produced by a UNet model from the PolyEgg study for automated detection. This ability to edit annotations creates a feedback loop that extends the study, by generating corrected data for retraining and improving the model.

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
To Follow

## Links to trained weights
Redacted

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
2. Activate Venv and install requirements using "pip install -r requirements.txt" for both web application and compute

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
   
### IV. Running the Web Application
1. On SHELL go to ROOT directory and activate venv
2. Change directory to server "cd server"
3. Run the server using "python manage.py runserver"
4. Access website on Localhost port 8000 (http://127.0.0.1:8000/)

### V. Running the Compute server
1. On SHELL go to ROOT directory and activate venv
2. python app.py

## VI. Deploying Your Own Model
<h2 align="center">Adding a New Model</h2>

```
static
└── js
    ├── image_upload
    │   ├── ModelConfig.js   [1]
    │   └── TableHandler.js [2]
    │   └── UploadHandler.js [3]
```

Edit **ModelConfig.js [1]** and add your model to the `MODELS` array.

```javascript
// Parameters:
// value - Used by the back-end
// label - Displayed to the user in the front-end

// The default selected label (Front-end) is the first item in the array.
static MODELS = [
  { value: "foo", label: "bar" },
  { value: "foo1", label: "bar1" }
]
```

<hr>
<h3 align="center">Files involved in loading these models </h3> 
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

<h2 align="center"> Sending details to server </h2>

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

<h3 align="center">UploadHandler.js[1] sends an upload request to the server</h3>

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
                case "your model value here @Param value of ModelConfig.js":
                  response = request.post(
                    "Your URL pathway [IP_ADDRESS:PORT/PATH]",
                    json=payload,
                    timeout=300
                  )
                  # this is defined as the response of your model
                  data = response.json()
                  status_code = response.status_code
            ...

            # Sample pipeline for points (POSTGRES)
            points = data.get("points", [])
            if points:
                for p in points:
                    AnnotationPoints.objects.create(
                        image=image_record,
                        x=p[0],
                        y=p[1],
                        is_original=True
                    )

            # Sample pipeline for rects (POSTGRES)
            rects = data.get("rects",[])
            if rects:
              for r in rects:
                AnnotationRects.objects.create(
                  image = image_record,
                  x_init = r[0]
                  y_init = r[1]
                  x_end = r[2]
                  y_end = r[3]
                  is_original=True
                )
  ...

```





### VII. Important Notes
1. Check gitIgnore before pushing
2. HTML Files on Egglytics/Templates
3. JS Scripts on Egglytics/static/js
4. URLS on Egglytics/urls.py
5. Views on Egglytics/views.py

## For Users
The application is currently in its early development phase and is not yet ready for use.

## To Do List:
1. Frontend fixes
