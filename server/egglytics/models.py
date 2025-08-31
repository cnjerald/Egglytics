# models.py
from django.db import models
from django.contrib.auth.models import User
import uuid

class ImageEntry(models.Model):
    filename = models.CharField(max_length=255)
    annotations = models.TextField(blank=True)
    token = models.CharField(max_length=64, unique=True, default=uuid.uuid4().hex)
    owner = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
