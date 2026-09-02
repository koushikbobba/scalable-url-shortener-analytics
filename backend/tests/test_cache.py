import pytest
from django.core.cache import cache
from apps.links.models import Link
from apps.links.services import LinkService


@pytest.mark.django_db
class TestCacheBehavior:
    def test_cache_aside_population_and_hit(self, test_user):
        link = Link.objects.create(
            user=test_user,
            short_code='cachetest1',
            original_url='https://example.com/cached'
        )

        cache_key = f"shortlink:{link.short_code}"
        cache.delete(cache_key)

        # 1. Cold lookup (Cache Miss -> DB Read -> Cache Population)
        dest_1 = LinkService.get_destination(link.short_code)
        assert dest_1 is not None
        assert dest_1['from_cache'] is False
        assert dest_1['original_url'] == 'https://example.com/cached'

        # 2. Hot lookup (Cache Hit)
        dest_2 = LinkService.get_destination(link.short_code)
        assert dest_2 is not None
        assert dest_2['from_cache'] is True

    def test_cache_invalidation_on_delete(self, test_user):
        link = Link.objects.create(
            user=test_user,
            short_code='cachetest2',
            original_url='https://example.com/cached2'
        )
        LinkService.set_link_cache(link)
        cache_key = f"shortlink:{link.short_code}"
        assert cache.get(cache_key) is not None

        # Invalidate
        LinkService.invalidate_link_cache(link.short_code)
        assert cache.get(cache_key) is None
