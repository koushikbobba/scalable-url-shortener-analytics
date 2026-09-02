import pytest
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
class TestAuthentication:
    def test_user_registration_success(self, api_client):
        url = reverse('auth_register')
        payload = {
            'email': 'newuser@example.com',
            'full_name': 'New User',
            'password': 'SecurePassword123!',
            'password_confirm': 'SecurePassword123!'
        }
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert 'user' in response.data
        assert response.data['user']['email'] == 'newuser@example.com'
        assert 'tokens' in response.data
        assert 'access' in response.data['tokens']
        assert 'refresh' in response.data['tokens']

    def test_user_registration_password_mismatch(self, api_client):
        url = reverse('auth_register')
        payload = {
            'email': 'badpass@example.com',
            'full_name': 'Mismatch User',
            'password': 'Password123!',
            'password_confirm': 'DifferentPassword456!'
        }
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_user_login_success(self, api_client, test_user):
        url = reverse('token_obtain_pair')
        payload = {
            'email': 'testuser@example.com',
            'password': 'Password123!'
        }
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data

    def test_user_login_invalid_credentials(self, api_client, test_user):
        url = reverse('token_obtain_pair')
        payload = {
            'email': 'testuser@example.com',
            'password': 'WrongPassword999!'
        }
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
