from django.urls import path
from .import views

urlpatterns = [
    path("", views.upload, name="upload"),
    path("edit/<int:image_id>/", views.edit, name="edit"),
    path("view/",views.view,name="view"),
    path("batch/<int:batch_id>/images/", views.batch_images, name="batch_images"),
    path("add_egg_to_db/<int:image_id>/", views.add_egg_to_db, name="add_egg_to_db"),
    path("remove_egg_from_db/<int:image_id>/", views.remove_egg_from_db, name="remove_egg_from_db"),
    path('batch/status/', views.batch_status, name='batch_status'),
    path('batch/status/latest/', views.batch_status_latest, name='batch_status_latest'),
    path("delete-batch/<int:batch_id>/", views.delete_batch, name="delete_batch"),
    path('delete-image/<int:image_id>/', views.delete_image, name='delete_image'),
    path('edit-batch-name/<int:batch_id>/', views.edit_batch_name, name='edit_batch_name'),
    path("test/",views.test,name="test"),

]

