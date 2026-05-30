import pytest
from django.conf import settings
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from .factories import UserFactory

pytestmark = pytest.mark.django_db

LOGIN_URL = "/api/v1/auth/login/"
LOGOUT_URL = "/api/v1/auth/logout/"
REFRESH_URL = "/api/v1/auth/token/refresh/"


class TestLogin:
    def test_successful_login_returns_200_and_sets_cookies(self, api_client):
        user = UserFactory(verified=True)
        resp = api_client.post(LOGIN_URL, {"email": user.email, "password": "TestPass123!"}, format="json")

        assert resp.status_code == status.HTTP_200_OK
        assert "access_token" in resp.cookies
        assert "refresh_token" in resp.cookies

    def test_cookies_have_httponly_flag(self, api_client):
        user = UserFactory(verified=True)
        resp = api_client.post(LOGIN_URL, {"email": user.email, "password": "TestPass123!"}, format="json")

        cookie = resp.cookies.get("access_token")
        assert cookie is not None

    def test_wrong_password_returns_401(self, api_client):
        user = UserFactory(verified=True)
        resp = api_client.post(LOGIN_URL, {"email": user.email, "password": "WrongPass123!"}, format="json")

        assert resp.status_code == status.HTTP_401_UNAUTHORIZED
        assert resp.data["detail"] == "Invalid credentials"

    def test_unverified_email_returns_401(self, api_client):
        from .factories import PendingUserFactory

        user = PendingUserFactory()
        resp = api_client.post(LOGIN_URL, {"email": user.email, "password": "TestPass123!"}, format="json")

        assert resp.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Email not verified" in resp.data["detail"]

    def test_suspended_account_returns_401(self, api_client):
        user = UserFactory(suspended=True)
        resp = api_client.post(LOGIN_URL, {"email": user.email, "password": "TestPass123!"}, format="json")

        assert resp.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Account suspended" in resp.data["detail"]


class TestLogout:
    def test_logout_blacklists_token_and_clears_cookies(self, api_client):
        user = UserFactory(verified=True)
        refresh = RefreshToken.for_user(user)
        api_client.cookies["access_token"] = str(refresh.access_token)
        api_client.cookies["refresh_token"] = str(refresh)

        resp = api_client.post(LOGOUT_URL, format="json")

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["detail"] == "Logged out."

    def test_logout_without_auth_returns_401(self, api_client):
        resp = api_client.post(LOGOUT_URL, format="json")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


class TestTokenRefresh:
    def test_valid_refresh_returns_new_tokens(self, api_client):
        user = UserFactory(verified=True)
        refresh = RefreshToken.for_user(user)
        api_client.cookies["refresh_token"] = str(refresh)

        resp = api_client.post(REFRESH_URL, format="json")

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["detail"] == "Token refreshed."

    def test_blacklisted_refresh_returns_401(self, api_client):
        user = UserFactory(verified=True)
        refresh = RefreshToken.for_user(user)
        refresh.blacklist()
        api_client.cookies["refresh_token"] = str(refresh)

        resp = api_client.post(REFRESH_URL, format="json")

        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_no_refresh_cookie_returns_401(self, api_client):
        resp = api_client.post(REFRESH_URL, format="json")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


class TestLoginRateLimit:
    def test_6th_login_attempt_in_1_minute_returns_429(self, api_client):
        from unittest.mock import patch

        from django.core.cache import cache
        from rest_framework.throttling import SimpleRateThrottle

        import uuid

        cache.clear()
        with patch.dict(SimpleRateThrottle.THROTTLE_RATES, {"login": "5/minute"}):
            for i in range(5):
                resp = api_client.post(
                    LOGIN_URL,
                    {"email": f"nonexistent{i}@example.com", "password": "WrongPass123!"},
                    format="json",
                )
                assert resp.status_code == status.HTTP_401_UNAUTHORIZED

            resp = api_client.post(
                LOGIN_URL,
                {"email": f"spam{str(uuid.uuid4())}@example.com", "password": "WrongPass123!"},
                format="json",
            )
            assert resp.status_code == status.HTTP_429_TOO_MANY_REQUESTS
