import os
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from apps.links.views import RedirectShortCodeView

def health_live_view(request):
    """Liveness probe: verifies the web process is running."""
    return JsonResponse({"status": "live", "service": "url-shortener-api"}, status=200)

def health_ready_view(request):
    """Readiness probe: checks PostgreSQL and Redis connectivity."""
    from django.db import connection
    from django.core.cache import cache
    
    checks = {"database": "ok", "cache": "ok"}
    status_code = 200
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception as e:
        checks["database"] = f"unhealthy: {str(e)}"
        status_code = 503

    try:
        cache.set("health_check_ping", "pong", timeout=5)
        if cache.get("health_check_ping") != "pong":
            checks["cache"] = "unhealthy: cache get failed"
            status_code = 503
    except Exception as e:
        checks["cache"] = f"unhealthy: {str(e)}"
        status_code = 503

def api_root_view(request):
    """API root landing view offering navigation and system status."""
    return JsonResponse({
        "service": "LinkStream Scalable URL Shortener & Analytics API",
        "version": "1.0.0",
        "documentation": "/api/docs/",
        "swagger_ui": "/api/docs/",
        "redoc": "/api/redoc/",
        "health_check": "/health/live/",
        "endpoints": {
            "auth_register": "/api/auth/register/",
            "auth_login": "/api/auth/login/",
            "links_crud": "/api/links/",
            "analytics_overview": "/api/analytics/overview/"
        }
    })

urlpatterns = [
    # System & Health Probes
    path('', api_root_view, name='api_root'),
    path('admin/', admin.site.urls),
    path('health/live/', health_live_view, name='health_live'),
    path('health/ready/', health_ready_view, name='health_ready'),
    path('metrics', include('django_prometheus.urls')),


    # API Documentation (OpenAPI / Swagger)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # REST APIs
    path('api/auth/', include('apps.users.urls')),
    path('api/links/', include('apps.links.urls')),
    path('api/analytics/', include('apps.analytics.urls')),

    # High-Performance Redirect Critical Path: GET /{short_code}
    path('<str:short_code>', RedirectShortCodeView.as_view(), name='redirect_short_code'),
]
