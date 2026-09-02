import pytest
from apps.links.models import Link
from apps.analytics.models import ClickEvent
from apps.analytics.services import AnalyticsIngestionService, AnalyticsQueryService


@pytest.mark.django_db
class TestAnalyticsEngine:
    def test_batch_ingestion_and_atomic_counter(self, test_user):
        link = Link.objects.create(
            user=test_user,
            short_code='analytics1',
            original_url='https://example.com'
        )

        raw_events = [
            {
                "link_id": str(link.id),
                "short_code": link.short_code,
                "timestamp": "2026-08-31T12:00:00Z",
                "ip_hash": "hash_ip_1",
                "referrer": "https://google.com",
                "browser": "Chrome 120",
                "os": "Windows 11",
                "device_type": "Desktop",
                "country_code": "US",
                "city": "New York"
            },
            {
                "link_id": str(link.id),
                "short_code": link.short_code,
                "timestamp": "2026-08-31T12:05:00Z",
                "ip_hash": "hash_ip_2",
                "referrer": "Direct",
                "browser": "Safari 17",
                "os": "iOS 17",
                "device_type": "Mobile",
                "country_code": "GB",
                "city": "London"
            },
            {
                "link_id": str(link.id),
                "short_code": link.short_code,
                "timestamp": "2026-08-31T12:10:00Z",
                "ip_hash": "hash_ip_1",  # Same visitor
                "referrer": "https://twitter.com",
                "browser": "Chrome 120",
                "os": "Windows 11",
                "device_type": "Desktop",
                "country_code": "US",
                "city": "New York"
            }
        ]

        count = AnalyticsIngestionService.process_batch(raw_events)
        assert count == 3

        link.refresh_from_db()
        assert link.click_count == 3
        assert ClickEvent.objects.filter(link=link).count() == 3

        # Test Analytics Query Service
        analytics = AnalyticsQueryService.get_link_analytics(link, time_range='7d')
        assert analytics['total_clicks'] == 3
        assert analytics['unique_visitors'] == 2  # hash_ip_1 and hash_ip_2
        assert len(analytics['top_countries']) > 0
