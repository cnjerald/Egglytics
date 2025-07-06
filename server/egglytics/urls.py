from django.urls import path
from .import views
'python manage.py runserver'

urlpatterns = [
    path("", views.home, name="home")
]

