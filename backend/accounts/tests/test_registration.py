from unittest.mock import patch

import pytest
from django.conf import settings
from rest_framework import status

from accounts.models import User, UserConsent

pytestmark = pytest.mark.django_db


# AUTH-HOTFIX-01: create_user now assigns the 'student' role and raises if the
# role definition is missing, so registration tests must have roles seeded.
@pytest.mark.usefixtures("seed_roles")
class TestRegister:
    REGISTER_URL = "/api/v1/auth/register/"
    VALID_PAYLOAD = {
        "email": "newuser@example.com",
        "full_name": "New User",
        "password": "Str0ng!Pass",
        "password_confirm": "Str0ng!Pass",
    }

    def test_happy_path_returns_201(self, api_client):
        with patch("accounts.services.registration.send_verification_email.delay") as mock_task:
            resp = api_client.post(self.REGISTER_URL, self.VALID_PAYLOAD, format="json")

        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["detail"] == "Registration successful. Check your email to verify your account."
        assert User.objects.filter(email="newuser@example.com").exists()

    def test_creates_user_in_pending_state(self, api_client):
        with patch("accounts.services.registration.send_verification_email.delay"):
            api_client.post(self.REGISTER_URL, self.VALID_PAYLOAD, format="json")

        user = User.objects.get(email="newuser@example.com")
        assert user.is_email_verified is False
        assert user.status == "pending"
        assert user.full_name == "New User"

    def test_creates_consent_record(self, api_client):
        with patch("accounts.services.registration.send_verification_email.delay"):
            resp = api_client.post(self.REGISTER_URL, self.VALID_PAYLOAD, format="json")

        assert resp.status_code == status.HTTP_201_CREATED
        user = User.objects.get(email="newuser@example.com")
        assert UserConsent.objects.filter(user=user, purpose="data_processing").exists()
        consent = UserConsent.objects.get(user=user)
        assert consent.consent_version == settings.CONSENT_VERSION
        assert consent.granted is True

    def test_enqueues_verification_email(self, api_client):
        with patch("accounts.services.registration.send_verification_email.delay") as mock_task:
            api_client.post(self.REGISTER_URL, self.VALID_PAYLOAD, format="json")

        mock_task.assert_called_once()
        user = User.objects.get(email="newuser@example.com")
        assert mock_task.call_args[0][0] == str(user.id)

    def test_duplicate_email_returns_400(self, api_client):
        from .factories import UserFactory

        UserFactory(email="dup@example.com")
        payload = {**self.VALID_PAYLOAD, "email": "dup@example.com"}

        resp = api_client.post(self.REGISTER_URL, payload, format="json")

        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_mismatch_returns_400(self, api_client):
        payload = {**self.VALID_PAYLOAD, "password_confirm": "DifferentPass1!"}
        resp = api_client.post(self.REGISTER_URL, payload, format="json")

        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "Passwords do not match" in str(resp.data)

    def test_invalid_email_format_returns_400(self, api_client):
        payload = {**self.VALID_PAYLOAD, "email": "not-an-email"}
        resp = api_client.post(self.REGISTER_URL, payload, format="json")

        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_short_password_returns_400(self, api_client):
        payload = {**self.VALID_PAYLOAD, "password": "short", "password_confirm": "short"}
        resp = api_client.post(self.REGISTER_URL, payload, format="json")

        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_rate_limit_61st_request_returns_429(self, api_client):
        from django.core.cache import cache
        from rest_framework.throttling import SimpleRateThrottle

        cache.clear()
        with patch.dict(SimpleRateThrottle.THROTTLE_RATES, {"anon": "60/hour"}):
            for _ in range(60):
                payload = {
                    "email": f"spam{_}@example.com",
                    "full_name": "Spam",
                    "password": "Str0ng!Pass",
                    "password_confirm": "Str0ng!Pass",
                }
                with patch("accounts.services.registration.send_verification_email.delay"):
                    api_client.post(self.REGISTER_URL, payload, format="json")

            resp = api_client.post(self.REGISTER_URL, {**self.VALID_PAYLOAD, "email": "spam60@example.com"}, format="json")
            assert resp.status_code == status.HTTP_429_TOO_MANY_REQUESTS

    def test_unauthenticated_user_cannot_access_protected_endpoints(self, api_client):
        resp = api_client.get("/api/v1/auth/profile/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED
