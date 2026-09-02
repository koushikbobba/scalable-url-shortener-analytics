from datetime import timedelta
from collections import Counter
import logging
from django.db import transaction
from django.db.models import Count, F, Q
from django.utils import timezone
from apps.links.models import Link
from .models import ClickEvent, DailyLinkMetrics
from apps.common.metrics import KAFKA_EVENTS_CONSUMED_TOTAL

logger = logging.getLogger(__name__)


class AnalyticsIngestionService:
    @classmethod
    def process_batch(cls, raw_events: list[dict]) -> int:
        """
        Batch processes a collection of Kafka click events.
        Uses bulk_create and atomic increment to achieve high write throughput.
        """
        if not raw_events:
            return 0

        click_events_to_create = []
        link_counts = Counter()

        for event in raw_events:
            try:
                link_id = event.get('link_id')
                if not link_id:
                    continue

                timestamp_str = event.get('timestamp')
                clicked_at = timezone.datetime.fromisoformat(timestamp_str) if timestamp_str else timezone.now()

                click_event = ClickEvent(
                    link_id=link_id,
                    clicked_at=clicked_at,
                    ip_hash=event.get('ip_hash', ''),
                    country_code=event.get('country_code', 'US'),
                    city=event.get('city', 'Unknown'),
                    browser=event.get('browser', 'Unknown'),
                    os=event.get('os', 'Unknown'),
                    device_type=event.get('device_type', 'Desktop'),
                    is_bot=event.get('is_bot', False),
                    referrer=event.get('referrer', 'Direct')
                )
                click_events_to_create.append(click_event)
                link_counts[link_id] += 1

            except Exception as e:
                logger.error(f"Error parsing event: {event}, error: {e}")

        if not click_events_to_create:
            return 0

        try:
            with transaction.atomic():
                # 1. Bulk insert raw events
                ClickEvent.objects.bulk_create(click_events_to_create, batch_size=500)

                # 2. Atomic increment of click counts on Link objects
                for link_id, count in link_counts.items():
                    Link.objects.filter(id=link_id).update(click_count=F('click_count') + count)

            KAFKA_EVENTS_CONSUMED_TOTAL.labels(status='success').inc(len(click_events_to_create))
            logger.info(f"Successfully ingested {len(click_events_to_create)} click events in batch.")
            return len(click_events_to_create)

        except Exception as e:
            logger.error(f"Database error during analytics batch ingestion: {e}")
            KAFKA_EVENTS_CONSUMED_TOTAL.labels(status='error').inc(len(click_events_to_create))
            return 0

    @classmethod
    def process_single_event(cls, event_data: dict) -> bool:
        """Fallback helper for single-event processing."""
        return cls.process_batch([event_data]) > 0


class AnalyticsQueryService:
    @staticmethod
    def _get_start_cutoff(time_range: str, now) -> timezone.datetime | None:
        if time_range == '24h':
            return now - timedelta(hours=24)
        elif time_range == '7d':
            return now - timedelta(days=7)
        elif time_range == '30d':
            return now - timedelta(days=30)
        return None

    @classmethod
    def get_link_analytics(cls, link: Link, time_range: str = '7d', start_date=None, end_date=None) -> dict:
        now = timezone.now()
        qs = ClickEvent.objects.filter(link=link)

        if start_date and end_date:
            qs = qs.filter(clicked_at__range=[start_date, end_date])
        else:
            cutoff = cls._get_start_cutoff(time_range, now)
            if cutoff:
                qs = qs.filter(clicked_at__gte=cutoff)

        total_clicks = max(link.click_count, qs.count())
        unique_visitors = qs.values('ip_hash').distinct().count()

        # Relative summary counts
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = now - timedelta(days=7)
        month_start = now - timedelta(days=30)

        clicks_today = max(qs.filter(clicked_at__gte=today_start).count(), 0)
        clicks_this_week = max(qs.filter(clicked_at__gte=week_start).count(), 0)
        clicks_this_month = max(qs.filter(clicked_at__gte=month_start).count(), 0)


        # Time series generation
        time_series = cls._build_time_series(qs, time_range, now)

        # Dimension breakdowns (top 5 each)
        top_countries = cls._aggregate_dimension(qs, 'country_code', total_clicks)
        top_devices = cls._aggregate_dimension(qs, 'device_type', total_clicks)
        top_browsers = cls._aggregate_dimension(qs, 'browser', total_clicks)
        top_referrers = cls._aggregate_dimension(qs, 'referrer', total_clicks)

        return {
            "link_id": str(link.id),
            "short_code": link.short_code,
            "original_url": link.original_url,
            "total_clicks": total_clicks,
            "unique_visitors": unique_visitors,
            "clicks_today": clicks_today,
            "clicks_this_week": clicks_this_week,
            "clicks_this_month": clicks_this_month,
            "clicks_over_time": time_series,
            "top_countries": top_countries,
            "top_devices": top_devices,
            "top_browsers": top_browsers,
            "top_referrers": top_referrers
        }

    @classmethod
    def get_overview_analytics(cls, user, time_range: str = '7d') -> dict:
        now = timezone.now()
        user_links = Link.objects.filter(user=user)
        total_links = user_links.count()

        qs = ClickEvent.objects.filter(link__user=user)
        cutoff = cls._get_start_cutoff(time_range, now)
        if cutoff:
            qs = qs.filter(clicked_at__gte=cutoff)

        db_click_sum = sum(user_links.values_list('click_count', flat=True)) or 0
        total_clicks = max(db_click_sum, qs.count())
        unique_visitors = qs.values('ip_hash').distinct().count()

        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        clicks_today = ClickEvent.objects.filter(link__user=user, clicked_at__gte=today_start).count()


        time_series = cls._build_time_series(qs, time_range, now)
        top_countries = cls._aggregate_dimension(qs, 'country_code', total_clicks)
        top_devices = cls._aggregate_dimension(qs, 'device_type', total_clicks)
        top_browsers = cls._aggregate_dimension(qs, 'browser', total_clicks)

        return {
            "total_links": total_links,
            "total_clicks": total_clicks,
            "unique_visitors": unique_visitors,
            "clicks_today": clicks_today,
            "clicks_over_time": time_series,
            "top_countries": top_countries,
            "top_devices": top_devices,
            "top_browsers": top_browsers
        }

    @staticmethod
    def _aggregate_dimension(queryset, field: str, total: int, limit: int = 5) -> list[dict]:
        if total == 0:
            return []
        items = (
            queryset.values(field)
            .annotate(count=Count('id'))
            .order_by('-count')[:limit]
        )
        return [
            {
                "name": item[field] or "Unknown",
                "count": item['count'],
                "percentage": round((item['count'] / total) * 100, 1)
            }
            for item in items
        ]

    @staticmethod
    def _build_time_series(queryset, time_range: str, now) -> list[dict]:
        series = []
        if time_range == '24h':
            # Hourly breakdown for last 24 hours
            for i in range(23, -1, -1):
                hour_slot = (now - timedelta(hours=i)).replace(minute=0, second=0, microsecond=0)
                next_slot = hour_slot + timedelta(hours=1)
                sub_qs = queryset.filter(clicked_at__gte=hour_slot, clicked_at__lt=next_slot)
                clicks = sub_qs.count()
                unique_v = sub_qs.values('ip_hash').distinct().count()
                series.append({
                    "timestamp": hour_slot.strftime("%H:00"),
                    "clicks": clicks,
                    "unique_visitors": unique_v
                })
        else:
            # Daily breakdown
            days = 7 if time_range == '7d' else 30
            for i in range(days - 1, -1, -1):
                day_slot = (now - timedelta(days=i)).date()
                sub_qs = queryset.filter(clicked_at__date=day_slot)
                clicks = sub_qs.count()
                unique_v = sub_qs.values('ip_hash').distinct().count()
                series.append({
                    "timestamp": day_slot.strftime("%b %d"),
                    "clicks": clicks,
                    "unique_visitors": unique_v
                })
        return series
