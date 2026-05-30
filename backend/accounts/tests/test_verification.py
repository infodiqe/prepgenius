from unittest.mock import patch

import pytest
from rest_framework import status

from accounts.models import EmailVerificationToken

from .factories import EmailVerificationTokenFactory, PendingUserFactory

pytestmark = pytest.mark.django_db

VERIFY_URL = "/api/v1/auth/verify-email/"
RESEND_URL = "/api/v1/auth/resend-verification/"


class TestVerifyEmail:
    def test_valid_token_verifies_and_activates_user(self, api_client):
        token = EmailVerificationTokenFactory()
        assert token.user.is_email_verified is False
        assert token.user.status == "pending"

        resp = api_client.post(VERIFY_URL, {"token": token.token}, format="json")

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["detail"] == "Email verified successfully. You can now log in."

        token.user.refresh_from_db()
        assert token.user.is_email_verified is True
        assert token.user.status == "active"

    def test_expired_token_returns_400(self, api_client):
        token = EmailVerificationTokenFactory(expired=True)
        resp = api_client.post(VERIFY_URL, {"token": token.token}, format="json")

        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "expired" in str(resp.data).lower()

    def test_already_used_token_returns_400(self, api_client):
        token = EmailVerificationTokenFactory(used=True)
        resp = api_client.post(VERIFY_URL, {"token": token.token}, format="json")

        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid" in str(resp.data)

    def test_nonexistent_token_returns_400(self, api_client):
        resp = api_client.post(VERIFY_URL, {"token": "nonexistent-token"}, format="json")

        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid" in str(resp.data)


class TestResendVerification:
    def test_resend_generates_new_token_and_invalidates_old(self, api_client):
        user = PendingUserFactory()
        old_token = EmailVerificationTokenFactory(user=user)

        with patch("accounts.services.verification.send_verification_email.delay") as mock_task:
            resp = api_client.post(RESEND_URL, {"email": user.email}, format="json")

        assert resp.status_code == status.HTTP_200_OK

        old_token.refresh_from_db()
        assert old_token.is_used is True

        new_token = EmailVerificationToken.objects.filter(user=user, is_used=False).first()
        assert new_token is not None
        assert new_token.token != old_token.token

        mock_task.assert_called_once_with(str(user.id), new_token.token)

    def test_resend_for_already_verified_user_returns_200(self, api_client):
        from .factories import UserFactory

        user = UserFactory()
        resp = api_client.post(RESEND_URL, {"email": user.email}, format="json")

        assert resp.status_code == status.HTTP_200_OK
