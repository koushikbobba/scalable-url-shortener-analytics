from django.db import models
from django.utils import timezone
from apps.links.models import Link


class ClickEvent(models.Model):
    id = models.BigAutoField(primary_key=True)
    link = models.ForeignKey(
        Link,
        on_delete=models.CASCADE,
        related_name='click_events',
        db_index=True
    )
    clicked_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        help_text="Timestamp when the redirect occurred"
    )
    ip_hash = models.CharField(
        max_length=64,
        db_index=True,
        help_text="SHA-256 salted hash of IP address for GDPR-compliant unique visitor tracking"
    )
    country_code = models.CharField(
        max_length=4,
        default='US',
        db_index=True,
        help_text="ISO 3166-1 alpha-2 country code"
    )
    city = models.CharField(
        max_length=100,
        blank=True,
        default='Unknown'
    )
    browser = models.CharField(
        max_length=64,
        blank=True,
        default='Unknown'
    )
    os = models.CharField(
        max_length=64,
        blank=True,
        default='Unknown'
    )
    device_type = models.CharField(
        max_length=32,
        default='Desktop',
        db_index=True
    )
    is_bot = models.BooleanField(
        default=False
    )
    referrer = models.CharField(
        max_length=2048,
        blank=True,
        default='Direct'
    )

    class Meta:
        db_table = 'link_click_events'
        ordering = ['-clicked_at']
        indexes = [
            models.Index(fields=['link', '-clicked_at'], name='idx_click_link_time'),
            models.Index(fields=['clicked_at', 'link'], name='idx_click_time_link'),
        ]

    def __str__(self):
        return f"Click on {self.link.short_code} at {self.clicked_at}"


class DailyLinkMetrics(models.Model):
    id = models.BigAutoField(primary_key=True)
    link = models.ForeignKey(
        Link,
        on_delete=models.CASCADE,
        related_name='daily_metrics'
    )
    date = models.DateField(
        db_index=True
    )
    total_clicks = models.PositiveIntegerField(default=0)
    unique_visitors = models.PositiveIntegerField(default=0)
    top_countries = models.JSONField(default=dict)
    top_browsers = models.JSONField(default=dict)
    top_devices = models.JSONField(default=dict)
    top_referrers = models.JSONField(default=dict)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'daily_link_metrics'
        constraints = [
            models.UniqueConstraint(fields=['link', 'date'], name='unique_daily_link_metric')
        ]
        indexes = [
            models.Index(fields=['link', '-date'], name='idx_daily_link_date'),
        ]

    def __str__(self):
        return f"Metrics for {self.link.short_code} on {self.date}: {self.total_clicks} clicks"
