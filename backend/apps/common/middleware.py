import time
import uuid
import logging
from django.http import JsonResponse
from django.conf import settings
from .utils import get_client_ip
from .rate_limit import rate_limiter
from .metrics import RATE_LIMIT_EXCEEDED_TOTAL

logger = logging.getLogger(__name__)


class RequestMetricsMiddleware:
    """
    Assigns a correlation Request ID and logs request latency.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        request.request_id = request_id
        start_time = time.time()

        response = self.get_response(request)

        duration = time.time() - start_time
        response['X-Request-ID'] = request_id
        response['X-Response-Time-MS'] = f"{duration * 1000:.2f}ms"

        return response


class RateLimitMiddleware:
    """
    Middleware applying distributed sliding window rate limiting.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Exclude internal metrics and schema paths from rate limiting
        path = request.path
        if path.startswith('/metrics') or path.startswith('/health') or path.startswith('/api/docs') or path.startswith('/api/schema'):
            return self.get_response(request)

        ip = get_client_ip(request)
        is_authenticated = request.user.is_authenticated if hasattr(request, 'user') else False
        user_id = str(request.user.id) if is_authenticated else None

        # Determine rate limit configuration based on route & auth
        if path == '/api/links/' and request.method == 'POST':
            identifier = user_id or ip
            limit = settings.RATE_LIMIT_LINK_CREATE_PER_MIN
            action = 'link_create'
        elif is_authenticated:
            identifier = user_id
            limit = settings.RATE_LIMIT_AUTH_PER_MIN
            action = 'auth_api'
        else:
            identifier = ip
            limit = settings.RATE_LIMIT_ANON_PER_MIN
            action = 'anon_req'

        allowed, remaining = rate_limiter.is_allowed(
            identifier=identifier,
            action=action,
            limit=limit,
            window_seconds=60
        )

        if not allowed:
            RATE_LIMIT_EXCEEDED_TOTAL.labels(action=action).inc()
            return JsonResponse({
                "error": {
                    "code": "rate_limit_exceeded",
                    "message": f"Rate limit exceeded. Maximum {limit} requests per minute allowed.",
                    "status_code": 429
                }
            }, status=429, headers={'Retry-After': '60'})

        response = self.get_response(request)
        response['X-RateLimit-Limit'] = str(limit)
        response['X-RateLimit-Remaining'] = str(remaining)
        return response
