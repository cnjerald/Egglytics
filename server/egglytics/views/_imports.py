# Django Core
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.utils import timezone

# Standard Libraries
import os
import json
import base64
import threading
import io
from datetime import datetime

# Third Party
import numpy as np
import requests
from PIL import Image

# Local Models
from .models import BatchDetails, ImageDetails, AnnotationPoints