# Django Core
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.utils import timezone
from django.db.models import Min, Max
from django.utils.dateparse import parse_date
from django.http import HttpResponse
from django.utils.timezone import now
from django.db.models import Sum


# Standard Libraries
import os
import json
import base64
import threading
import io
from datetime import datetime
import zipfile
from io import BytesIO



# Third Party
import numpy as np
import requests
from PIL import Image

# Local Models
from .models import BatchDetails, ImageDetails, AnnotationPoints,AnnotationRect
