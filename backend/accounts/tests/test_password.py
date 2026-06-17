from unittest.mock import patch

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import PasswordResetToken, User
from .factories import PasswordResetTokenFactory, UserFactory

pytestmark = pytest.mark.django_db

REQUEST_URL = "/api/v1/auth/password/reset/"
CONFIRM_URL = "/api/v1/auth/password/confirm/"


class TestPasswordResetRequest:
    def test_unknown_email_returns_200_anti_enumeration(self, api_client):
        resp = api_client.post(REQUEST_URL, {"email": "nobody@example.com"}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        assert "sent" in resp.data["detail"].lower()

    def test_known_email_enqueues_email_task(self, api_client):
        user = UserFactory(verified=True)
        with patch("accounts.services.password_service.send_password_reset_email.delay") as mock_task:
            resp = api_client.post(REQUEST_URL, {"email": user.email}, format="json")

        assert resp.status_code == status.HTTP_200_OK
        mock_task.assert_called_once()
        assert mock_task.call_args[0][0] == str(user.id)


class TestPasswordResetConfirm:
    def test_valid_token_resets_password(self, api_client):
        user = UserFactory(verified=True)
        token = PasswordResetTokenFactory(user=user)

        resp = api_client.post(
            CONFIRM_URL,
            {"token": token.token, "new_password": "NewStr0ng!Pass", "new_password_confirm": "NewStr0ng!Pass"},
            format="json",
        )

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["detail"] == "Password reset successfully. Please log in."

        user.refresh_from_db()
        assert user.check_password("NewStr0ng!Pass")
        assert not user.check_password("TestPass123!")

    def test_expired_token_returns_400(self, api_client):
        token = PasswordResetTokenFactory(expired=True)
        resp = api_client.post(
            CONFIRM_URL,
            {"token": token.token, "new_password": "NewStr0ng!Pass", "new_password_confirm": "NewStr0ng!Pass"},
            format="json",
        )

        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "expired" in str(resp.data).lower()

    def test_already_used_token_returns_400(self, api_client):
        token = PasswordResetTokenFactory(used=True)
        resp = api_client.post(
            CONFIRM_URL,
            {"token": token.token, "new_password": "NewStr0ng!Pass", "new_password_confirm": "NewStr0ng!Pass"},
            format="json",
        )

        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid" in str(resp.data)

    def test_weak_password_returns_400(self, api_client):
        user = UserFactory(verified=True)
        token = PasswordResetTokenFactory(user=user)
        resp = api_client.post(
            CONFIRM_URL,
            {"token": token.token, "new_password": "short", "new_password_confirm": "short"},
            format="json",
        )

        assert resp.status_code == status.HTTP_400_BAD_REQUEST


CHANGE_URL = "/api/v1/auth/password/change/"


class TestPasswordChange:
    def test_unauthenticated_change_password_returns_401(self, api_client: APIClient) -> None:
        resp = api_client.post(
            CHANGE_URL,
            {
                "current_password": "TestPass123!",
                "new_password": "NewStr0ng!Pass",
                "new_password_confirm": "NewStr0ng!Pass",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_wrong_current_password_returns_400(
        self, auth_client: tuple[APIClient, User]
    ) -> None:
        client, user = auth_client
        resp = client.post(
            CHANGE_URL,
            {
                "current_password": "WrongPassword123!",
                "new_password": "NewStr0ng!Pass",
                "new_password_confirm": "NewStr0ng!Pass",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "Incorrect current password" in str(resp.data)

    def test_weak_new_password_returns_400(self, auth_client: tuple[APIClient, User]) -> None:
        client, user = auth_client
        resp = client.post(
            CHANGE_URL,
            {
                "current_password": "TestPass123!",
                "new_password": "short",
                "new_password_confirm": "short",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_mismatch_new_password_returns_400(
        self, auth_client: tuple[APIClient, User]
    ) -> None:
        client, user = auth_client
        resp = client.post(
            CHANGE_URL,
            {
                "current_password": "TestPass123!",
                "new_password": "NewStr0ng!Pass",
                "new_password_confirm": "DifferentPass123!",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "New passwords do not match" in str(resp.data)

    def test_successful_password_change(self, auth_client: tuple[APIClient, User]) -> None:
        client, user = auth_client
        resp = client.post(
            CHANGE_URL,
            {
                "current_password": "TestPass123!",
                "new_password": "NewStr0ng!Pass",
                "new_password_confirm": "NewStr0ng!Pass",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["detail"] == "Password changed successfully."

        user.refresh_from_db()
        assert user.check_password("NewStr0ng!Pass")
        assert not user.check_password("TestPass123!")

