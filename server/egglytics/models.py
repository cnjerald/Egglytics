# models.py
from django.db import models
from django.contrib.auth.models import User

class BatchDetails(models.Model):
    batch_name = models.CharField(max_length=255)
    date_updated = models.DateTimeField(auto_now=True)
    owner = models.CharField(max_length=150)
    total_images = models.IntegerField()
    total_eggs = models.IntegerField()
    total_hatched = models.IntegerField()
    is_complete = models.BooleanField()
    has_fail_present = models.BooleanField(default = False)

    class Meta:
        db_table = "batch_details"   # TABLE NAME.

class ImageDetails(models.Model):
    image_id = models.AutoField(primary_key=True)
    # Foreign key based on batch_details_key
    batch = models.ForeignKey(
        BatchDetails,
        on_delete=models.CASCADE,
        db_column="batch_id"   # link to batch_details table
    )
    image_name = models.CharField(max_length=255)
    total_eggs = models.IntegerField()
    total_hatched = models.IntegerField()
    date_uploaded = models.DateTimeField(auto_now_add=True)
    last_update = models.DateTimeField(auto_now=True)
    IMG_TYPE_CHOICES = [
        ("MICRO", "Micro"),
        ("MACRO", "Macro"),
    ]
    img_type = models.CharField(max_length=10, choices=IMG_TYPE_CHOICES)
    allow_collection = models.BooleanField(default=True)
    is_processed = models.BooleanField()
    is_validated = models.BooleanField()

    class Meta:
        db_table = "image_details"  # TABLE NAME.

class AnnotationPoints(models.Model):
    point_id = models.AutoField(primary_key=True)
    image = models.ForeignKey(
        ImageDetails,
        on_delete=models.CASCADE,
        db_column="image_id"   # explicitly link to image_details
    )
    x = models.IntegerField()
    y = models.IntegerField()
    is_original = models.BooleanField(default=True)   # model’s first output
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = "annotation_points"

