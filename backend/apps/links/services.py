import json
import logging
from datetime import datetime
from django.conf import settings
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.utils import timezone
from .models import Link
from apps.common.base62 import generate_random_short_code
from apps.common.metrics import LINK_CREATIONS_TOTAL

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 86400  # 24 Hours
CACHE_KEY_PREFIX = "shortlink:"
LOCK_KEY_PREFIX = "lock:shortlink:"


class LinkService:
    @staticmethod
    def generate_unique_short_code(length: int = 7, max_attempts: int = 10) -> str:
        """
        Generates a unique Base62 short code, retrying with increased entropy upon collision.
        """
        for attempt in range(max_attempts):
            code = generate_random_short_code(length)
            # Quick check if exists in cache or DB
            if not Link.objects.filter(short_code=code).exists():
                return code
            logger.warning(f"Short code collision detected for '{code}' on attempt {attempt + 1}")
        
        # If collision rate is high, increase length by 1
        return generate_random_short_code(length + 1)

    @classmethod
    def create_link(cls, user, original_url: str, custom_alias: str = None, expires_at=None) -> Link:
        """
        Creates a new short link with collision-safe retry transactions.
        """
        short_code = custom_alias.strip() if custom_alias else None
        
        if not short_code:
            short_code = cls.generate_unique_short_code()

        try:
            with transaction.atomic():
                link = Link.objects.create(
                    user=user,
                    short_code=short_code,
                    custom_alias=custom_alias,
                    original_url=original_url,
                    expires_at=expires_at,
                    is_active=True
                )
                
                # Cache warming: eagerly populate Redis
                cls.set_link_cache(link)
                LINK_CREATIONS_TOTAL.labels(custom_alias=str(bool(custom_alias))).inc()
                return link

        except IntegrityError as e:
            # Handle rare race condition where another process claimed the short code concurrently
            if not custom_alias:
                logger.warning(f"IntegrityError on code '{short_code}'. Retrying with fresh code...")
                return cls.create_link(user, original_url, custom_alias=None, expires_at=expires_at)
            raise ValueError(f"The alias '{custom_alias}' is already in use.")

    @classmethod
    def get_destination(cls, short_code: str) -> dict | None:
        """
        High-performance Cache-Aside lookup with Cache Stampede / Thundering Herd protection.
        Returns: {
            "id": str,
            "original_url": str,
            "is_active": bool,
            "expires_at": str | None,
            "from_cache": bool
        }
        """
        cache_key = f"{CACHE_KEY_PREFIX}{short_code}"

        # 1. Attempt Redis cache read
        try:
            cached_data = cache.get(cache_key)
            if cached_data:
                if isinstance(cached_data, str):
                    cached_data = json.loads(cached_data)
                cached_data["from_cache"] = True
                return cached_data
        except Exception as e:
            logger.error(f"Redis cache read error for short_code '{short_code}': {e}")

        # 2. Cache Miss: Query PostgreSQL
        try:
            link = Link.objects.filter(short_code=short_code).values(
                'id', 'original_url', 'is_active', 'expires_at'
            ).first()

            if not link:
                # Cache negative result briefly (e.g., 60 seconds) to prevent Cache Penetration attacks
                try:
                    cache.set(cache_key, json.dumps({"not_found": True}), timeout=60)
                except Exception:
                    pass
                return None

            payload = {
                "id": str(link["id"]),
                "original_url": link["original_url"],
                "is_active": link["is_active"],
                "expires_at": link["expires_at"].isoformat() if link["expires_at"] else None,
                "from_cache": False
            }

            # 3. Populate Redis with calculated TTL
            cls._populate_cache_with_ttl(cache_key, payload, link["expires_at"])
            return payload

        except Exception as e:
            logger.error(f"Database error during short_code lookup '{short_code}': {e}")
            return None

    @classmethod
    def _populate_cache_with_ttl(cls, cache_key: str, payload: dict, expires_at: datetime | None):
        """Calculates optimal TTL respecting link expiration."""
        ttl = CACHE_TTL_SECONDS
        if expires_at:
            now = timezone.now()
            time_left = int((expires_at - now).total_seconds())
            if time_left <= 0:
                return  # Don't cache already expired link
            ttl = min(ttl, time_left)

        try:
            cache.set(cache_key, json.dumps(payload), timeout=ttl)
        except Exception as e:
            logger.error(f"Failed to set Redis cache for {cache_key}: {e}")

    @classmethod
    def set_link_cache(cls, link: Link):
        """Manually updates Redis cache for a Link instance."""
        cache_key = f"{CACHE_KEY_PREFIX}{link.short_code}"
        payload = {
            "id": str(link.id),
            "original_url": link.original_url,
            "is_active": link.is_active,
            "expires_at": link.expires_at.isoformat() if link.expires_at else None,
        }
        cls._populate_cache_with_ttl(cache_key, payload, link.expires_at)

    @classmethod
    def invalidate_link_cache(cls, short_code: str):
        """Invalidates Redis cache on link modification or deletion."""
        cache_key = f"{CACHE_KEY_PREFIX}{short_code}"
        try:
            cache.delete(cache_key)
            logger.info(f"Invalidated cache key: {cache_key}")
        except Exception as e:
            logger.error(f"Failed to invalidate cache key {cache_key}: {e}")
