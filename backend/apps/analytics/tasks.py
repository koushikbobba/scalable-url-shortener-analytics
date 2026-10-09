import logging
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from apps.links.models import Link
from .models import ClickEvent, DailyLinkMetrics
from .services import AnalyticsIngestionService

logger = logging.getLogger(__name__)


@shared_task(name="apps.analytics.tasks.process_single_click_event_fallback")
def process_single_click_event_fallback(event_data: dict):
    """
    Fallback Celery worker task when Kafka is unavailable.
    """
    try:
        AnalyticsIngestionService.process_single_event(event_data)
    except Exception as e:
        logger.error(f"Fallback Celery event ingestion failed: {e}")


@shared_task(name="apps.analytics.tasks.aggregate_daily_metrics_task")
def aggregate_daily_metrics_task():
    """
    Periodic task: pre-aggregates hourly raw click events into DailyLinkMetrics rollup tables.
    """
    logger.info("Starting scheduled daily metrics rollup aggregation...")
    yesterday = (timezone.now() - timedelta(days=1)).date()
    
    links = Link.objects.filter(is_active=True)
    count = 0

    for link in links:
        qs = ClickEvent.objects.filter(link=link, clicked_at__date=yesterday)
        total_clicks = qs.count()
        if total_clicks == 0:
            continue

        unique_visitors = qs.values('ip_hash').distinct().count()
        
        # Build JSON aggregates
        from .services import AnalyticsQueryService
        top_countries = {item['name']: item['count'] for item in AnalyticsQueryService._aggregate_dimension(qs, 'country_code', total_clicks)}
        top_devices = {item['name']: item['count'] for item in AnalyticsQueryService._aggregate_dimension(qs, 'device_type', total_clicks)}
        top_browsers = {item['name']: item['count'] for item in AnalyticsQueryService._aggregate_dimension(qs, 'browser', total_clicks)}
        top_referrers = {item['name']: item['count'] for item in AnalyticsQueryService._aggregate_dimension(qs, 'referrer', total_clicks)}

        DailyLinkMetrics.objects.update_or_create(
            link=link,
            date=yesterday,
            defaults={
                'total_clicks': total_clicks,
                'unique_visitors': unique_visitors,
                'top_countries': top_countries,
                'top_devices': top_devices,
                'top_browsers': top_browsers,
                'top_referrers': top_referrers,
            }
        )
        count += 1

    logger.info(f"Aggregated daily metrics for {count} links.")
    return f"Aggregated {count} links"


@shared_task(name="apps.analytics.tasks.purge_old_click_events_task")
def purge_old_click_events_task(retention_days: int = 90):
    """
    Periodic task: purges raw ClickEvent rows older than retention threshold (default 90 days),
    while preserving pre-aggregated DailyLinkMetrics summary rollups.
    """
    logger.info(f"Starting raw click event retention pruning (retention_days={retention_days})...")
    cutoff_date = timezone.now() - timedelta(days=retention_days)
    deleted_count, _ = ClickEvent.objects.filter(clicked_at__lt=cutoff_date).delete()
    logger.info(f"Successfully purged {deleted_count} raw click events older than {cutoff_date}.")
    return f"Purged {deleted_count} events"

