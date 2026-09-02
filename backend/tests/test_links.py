import pytest
from datetime import timedelta
from rest_framework import status
from django.utils import timezone
from apps.links.models import Link
from apps.links.services import LinkService


@pytest.mark.django_db
class TestLinkOperations:
    def test_create_link_auto_short_code(self, auth_client, test_user):
        url = '/api/links/'
        payload = {
            'original_url': 'https://github.com/torvalds/linux'
        }
        response = auth_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert 'short_code' in response.data
        assert len(response.data['short_code']) == 7
        assert response.data['original_url'] == 'https://github.com/torvalds/linux'

    def test_create_link_custom_alias(self, auth_client):
        url = '/api/links/'
        payload = {
            'original_url': 'https://python.org',
            'custom_alias': 'my-python'
        }
        response = auth_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['short_code'] == 'my-python'

    def test_create_duplicate_custom_alias_fails(self, auth_client, sample_link):
        url = '/api/links/'
        payload = {
            'original_url': 'https://google.com',
            'custom_alias': sample_link.short_code
        }
        response = auth_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_reserved_alias_fails(self, auth_client):
        url = '/api/links/'
        for reserved in ['admin', 'api', 'metrics', 'health']:
            response = auth_client.post(url, {'original_url': 'https://google.com', 'custom_alias': reserved}, format='json')
            assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_user_can_only_access_own_links(self, auth_client, another_user):
        # Create a link belonging to another user
        other_link = Link.objects.create(
            user=another_user,
            short_code='other123',
            original_url='https://other.com'
        )
        response = auth_client.get(f'/api/links/{other_link.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_link_expiration_validation(self, auth_client):
        url = '/api/links/'
        past_date = (timezone.now() - timedelta(days=1)).isoformat()
        payload = {
            'original_url': 'https://example.com',
            'expires_at': past_date
        }
        response = auth_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
