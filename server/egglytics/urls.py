from django.urls import path
from .views import metrics, upload, view, editor, export

urlpatterns = [
    # UPLOAD PAGE
    path("", upload.upload, name="upload"),

    # VIEW PAGE
    path("view/",view.view,name="view"),
    path('batch/status/', view.batch_status, name='batch_status'),
    path("batch/<int:batch_id>/images/", view.batch_images, name="batch_images"),
    path('batch/status/latest/', view.batch_status_latest, name='batch_status_latest'),
    path("delete-batch/<int:batch_id>/", view.delete_batch, name="delete_batch"),
    path('delete-image/<int:image_id>/', view.delete_image, name='delete_image'),
    path('edit-batch-name/<int:batch_id>/', view.edit_batch_name, name='edit_batch_name'),
    path("editor/<int:image_id>/", view.edit, name="edit"), # EDITOR BUTTON

    # EDITOR FUNCTION PAGE
    path("add_egg_to_db/<int:image_id>/", editor.add_egg_to_db, name="add_egg_to_db"),
    path("remove_egg_from_db/<int:image_id>/", editor.remove_egg_from_db, name="remove_egg_from_db"),

    # METRICS PAGE
    path("metric/",metrics.metric,name="metric"),
    path("metric/ajax/", metrics.metric_ajax, name="metric_ajax"),

    # EXPORTING
    path("export/",export.export,name="export"),

]

