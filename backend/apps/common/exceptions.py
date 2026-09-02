from rest_framework.views import exception_handler
from rest_framework.exceptions import APIException
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


class RateLimitExceeded(APIException):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = 'Request limit exceeded. Please try again later.'
    default_code = 'rate_limit_exceeded'


class LinkExpiredException(APIException):
    status_code = status.HTTP_410_GONE
    default_detail = 'This short link has expired.'
    default_code = 'link_expired'


class LinkDisabledException(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'This short link is disabled.'
    default_code = 'link_disabled'


def custom_exception_handler(exc, context):
    """
    Custom exception handler to ensure standard JSON error payload across all APIs.
    """
    response = exception_handler(exc, context)

    if response is not None:
        custom_data = {
            'error': {
                'code': getattr(exc, 'default_code', 'error'),
                'message': response.data.get('detail', str(response.data)),
                'status_code': response.status_code
            }
        }
        response.data = custom_data
    else:
        logger.error(f"Unhandled exception in request context: {context}", exc_info=exc)

    return response
