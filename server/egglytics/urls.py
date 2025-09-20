from django.urls import path
from .import views

urlpatterns = [
    path("", views.upload, name="upload"),
    path("edit/<int:image_id>/", views.edit, name="edit"),
    path("view/",views.view,name="view"),
    path("batch/<int:batch_id>/images/", views.batch_images, name="batch_images"),
    path("add_egg_to_db/<int:image_id>/", views.add_egg_to_db, name="add_egg_to_db"),
    path("remove_egg_from_db/<int:image_id>/", views.remove_egg_from_db, name="remove_egg_from_db"),
]

