import pytest
from apps.common.rate_limit import SlidingWindowRateLimiter


class TestRateLimiter:
    def test_sliding_window_allow_and_block(self, monkeypatch):
        limiter = SlidingWindowRateLimiter()
        
        # Test in-memory / redis simulation
        identifier = "test_user_rate_limit"
        action = "test_action"
        limit = 3

        # First 3 requests should succeed
        for i in range(3):
            allowed, remaining = limiter.is_allowed(identifier, action, limit, window_seconds=60)
            assert allowed is True

        # 4th request must be rejected
        allowed, remaining = limiter.is_allowed(identifier, action, limit, window_seconds=60)
        assert allowed is False
        assert remaining == 0
