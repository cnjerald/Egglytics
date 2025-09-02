from django.urls import path
from .import views

urlpatterns = [
    path("", views.upload, name="upload"),
    path("edit/<int:image_id>/", views.edit, name="edit"),
    path("view/",views.view,name="view"),
    path("batch/<int:batch_id>/images/", views.batch_images, name="batch_images"),
]

