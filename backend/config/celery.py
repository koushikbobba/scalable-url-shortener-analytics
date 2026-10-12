import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('url_shortener')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Periodic tasks for link expiration cleanup and daily metrics aggregation
app.conf.beat_schedule = {
    'aggregate-daily-metrics-every-hour': {
        'task': 'apps.analytics.tasks.aggregate_daily_metrics_task',
        'schedule': crontab(minute=0),  # Runs at top of every hour
    },
    'cleanup-expired-links-daily': {
        'task': 'apps.links.tasks.cleanup_expired_cache_task',
        'schedule': crontab(hour=2, minute=0),  # Runs daily at 2:00 AM
    },
    'purge-old-click-events-weekly': {
        'task': 'apps.analytics.tasks.purge_old_click_events_task',
        'schedule': crontab(hour=3, minute=0, day_of_week='sunday'),  # Weekly at 3:00 AM Sunday
        'kwargs': {'retention_days': 90},
    },
}

# Broker connection retry on startup (Celery 6+ compatible)
app.conf.broker_connection_retry_on_startup = True

