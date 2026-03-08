from waitress import serve
from server.wsgi import application  # your WSGI module
from django.conf import settings
from django.conf.urls.static import static
from django.core.wsgi import get_wsgi_application

if settings.DEBUG:
    # Serve static and media files while DEBUG=True
    from werkzeug.middleware.shared_data import SharedDataMiddleware

    application = SharedDataMiddleware(
        application,
        {
            '/static/': str(settings.BASE_DIR / 'egglytics' / 'static'),  # adjust path
            '/media/': str(settings.MEDIA_ROOT)
        }
    )

print("Starting Waitress server on http://0.0.0.0:8000 ...")
serve(application, host='0.0.0.0', port=8000)
