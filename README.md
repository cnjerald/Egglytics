# Egglytics

## For Developers
## I. Initial Setup
1. pip install -r requirements.txt
2. Create a .env file on ROOT
3. In this .env file add these lines

SECRET_KEY="YOUR_KEY"

DB_NAME='YOUR_DB_NAME'

DB_USER='YOUR_USERNAME'

DB_PASSWORD='YOUR_PASSWORD'

DB_HOST='localhost'

DB_PORT='5432'
   
### I. Running the Web Server
1. Activate venv (Install requirements txt)
2. cd server
2. python manage.py runserver
3. Access website on Localhost port 8000 (http://127.0.0.1:8000/)

### II. Running the Compute server
1. Activate venv
2. python app.py

### III. Important Notes
1. Check gitIgnore before pushing
2. HTML Files on Egglytics/Templates
3. JS Scripts on Egglytics/static/js
4. URLS on Egglytics/urls.py
5. Views on Egglytics/views.py

## For Users
The application is currently in its early development phase and is not yet ready for use.

## To Do List:
1. Merge model outputs with editor
