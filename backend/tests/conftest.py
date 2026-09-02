import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.links.models import Link

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def test_user(db):
    return User.objects.create_user(
        email='testuser@example.com',
        password='Password123!',
        full_name='Test Developer'
    )


@pytest.fixture
def another_user(db):
    return User.objects.create_user(
        email='another@example.com',
        password='Password123!',
        full_name='Another Dev'
    )


@pytest.fixture
def auth_client(api_client, test_user):
    api_client.force_authenticate(user=test_user)
    return api_client


@pytest.fixture
def sample_link(db, test_user):
    return Link.objects.create(
        user=test_user,
        short_code='abc1234',
        original_url='https://example.com/target-page',
        is_active=True
    )
