import time
import uuid
import logging
from django.conf import settings
import redis

logger = logging.getLogger(__name__)


class SlidingWindowRateLimiter:
    """
    Redis Sorted Set (ZSET) based Sliding Window Rate Limiter.
    Ensures precise rolling-window rate limiting without boundary burst anomalies.
    Provides in-memory fallback when Redis is unreachable or during unit testing.
    """
    def __init__(self, redis_url=None):
        self.redis_url = redis_url or getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0')
        self._client = None
        self._memory_store = {}
        self._redis_disabled = getattr(settings, 'IS_TESTING', False) or getattr(settings, 'USE_SQLITE', False)

    @property
    def client(self):
        if self._redis_disabled:
            return None
        if self._client is None:
            try:
                self._client = redis.from_url(
                    self.redis_url,
                    socket_connect_timeout=0.1,
                    socket_timeout=0.1,
                    decode_responses=True
                )
                self._client.ping()
            except Exception as e:
                self._client = None
                self._redis_disabled = True
        return self._client


    def is_allowed(self, identifier: str, action: str, limit: int, window_seconds: int = 60) -> tuple[bool, int]:
        """
        Check if the request is permitted within the sliding window.
        Returns: (is_allowed: bool, remaining_tokens: int)
        """
        r = self.client
        key = f"ratelimit:{action}:{identifier}"
        now = time.time()
        window_start = now - window_seconds
        member_id = f"{now}-{uuid.uuid4().hex[:8]}"

        if r is not None:
            try:
                pipeline = r.pipeline(transaction=True)
                pipeline.zremrangebyscore(key, 0, window_start)
                pipeline.zcard(key)
                pipeline.zadd(key, {member_id: now})
                pipeline.expire(key, window_seconds + 5)
                results = pipeline.execute()
                current_count = results[1]

                if current_count >= limit:
                    r.zrem(key, member_id)
                    return False, 0

                remaining = max(0, limit - (current_count + 1))
                return True, remaining
            except (redis.ConnectionError, redis.TimeoutError) as e:
                logger.error(f"Redis error during rate limiting check: {e}")
                self._client = None
            except Exception as e:
                logger.error(f"Unexpected error in SlidingWindowRateLimiter: {e}")

        # In-memory sliding window fallback
        timestamps = [ts for ts in self._memory_store.get(key, []) if ts > window_start]
        if len(timestamps) >= limit:
            self._memory_store[key] = timestamps
            return False, 0

        timestamps.append(now)
        self._memory_store[key] = timestamps
        remaining = max(0, limit - len(timestamps))
        return True, remaining


rate_limiter = SlidingWindowRateLimiter()

