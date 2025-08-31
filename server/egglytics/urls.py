from django.urls import path
from .import views
'python manage.py runserver'

urlpatterns = [
    path("", views.upload, name="upload"),
    path("edit/",views.edit,name="edit"),
    path("view/",views.view,name="view"),
]

