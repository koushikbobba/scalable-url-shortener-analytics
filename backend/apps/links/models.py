import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class Link(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='links',
        db_index=True
    )
    short_code = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        help_text="Unique Base62 short code or custom alias"
    )
    custom_alias = models.CharField(
        max_length=64,
        null=True,
        blank=True,
        help_text="User specified custom alias if provided"
    )
    original_url = models.TextField(
        help_text="Original long destination URL"
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Soft disable/enable toggle for the link"
    )
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Optional expiration timestamp"
    )
    click_count = models.BigIntegerField(
        default=0,
        help_text="Cached total click count"
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        editable=False,
        db_index=True
    )
    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        db_table = 'links'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at'], name='idx_link_user_created'),
            models.Index(fields=['is_active', 'expires_at'], name='idx_link_active_expires'),
        ]

    def __str__(self):
        return f"{self.short_code} -> {self.original_url[:40]}"

    @property
    def is_expired(self) -> bool:
        """Determines if link has exceeded its expiration date."""
        if self.expires_at is None:
            return False
        return timezone.now() > self.expires_at

    @property
    def is_valid_for_redirect(self) -> bool:
        """Validates if link can currently perform redirects."""
        return self.is_active and not self.is_expired
