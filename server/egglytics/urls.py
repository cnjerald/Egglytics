from django.urls import path
from .import views
'python manage.py runserver'

urlpatterns = [
    path("", views.upload, name="upload"),
    path("test/",views.edit,name="edit"),
]

