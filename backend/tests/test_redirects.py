import pytest
from datetime import timedelta
from rest_framework import status
from django.utils import timezone
from apps.links.models import Link


@pytest.mark.django_db
class TestRedirects:
    def test_redirect_valid_short_code(self, api_client, sample_link):
        response = api_client.get(f'/{sample_link.short_code}')
        assert response.status_code == status.HTTP_302_FOUND
        assert response.url == sample_link.original_url

    def test_redirect_nonexistent_short_code(self, api_client):
        response = api_client.get('/doesnotexist999')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_redirect_disabled_link(self, api_client, test_user):
        link = Link.objects.create(
            user=test_user,
            short_code='disabledlink',
            original_url='https://example.com',
            is_active=False
        )
        response = api_client.get(f'/{link.short_code}')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_redirect_expired_link(self, api_client, test_user):
        link = Link.objects.create(
            user=test_user,
            short_code='expiredlink',
            original_url='https://example.com',
            expires_at=timezone.now() - timedelta(minutes=5),
            is_active=True
        )
        response = api_client.get(f'/{link.short_code}')
        assert response.status_code == status.HTTP_410_GONE
