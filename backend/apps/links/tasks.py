import logging
from celery import shared_task
from django.utils import timezone
from .models import Link
from .services import LinkService

logger = logging.getLogger(__name__)


@shared_task(name="apps.links.tasks.cleanup_expired_cache_task")
def cleanup_expired_cache_task():
    """
    Scans for recently expired links and purges them from Redis cache.
    """
    now = timezone.now()
    expired_links = Link.objects.filter(is_active=True, expires_at__lte=now)
    count = 0
    for link in expired_links:
        LinkService.invalidate_link_cache(link.short_code)
        count += 1
    logger.info(f"Cleaned up {count} expired link cache keys.")
    return f"Cleaned up {count} expired links."
