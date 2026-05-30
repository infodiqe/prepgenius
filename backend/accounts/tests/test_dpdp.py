from unittest.mock import patch

import pytest
from rest_framework import status

from .factories import UserFactory

pytestmark = pytest.mark.django_db

EXPORT_URL = "/api/v1/auth/data/export/"
DELETE_URL = "/api/v1/auth/account/delete/"


class TestDataExport:
    def test_export_returns_202_and_enqueues_task(self, auth_client):
        client, user = auth_client
        with patch("accounts.services.dpdp_service.export_user_data_async.delay") as mock_task:
            resp = client.post(EXPORT_URL, format="json")

        assert resp.status_code == status.HTTP_202_ACCEPTED
        assert "export" in resp.data["detail"].lower()
        mock_task.assert_called_once_with(str(user.id))

    def test_export_without_auth_returns_401(self, api_client):
        resp = api_client.post(EXPORT_URL, format="json")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


class TestAccountDelete:
    def test_delete_with_correct_password_anonymizes_pii(self, auth_client):
        client, user = auth_client
        original_email = user.email

        resp = client.delete(DELETE_URL, {"password": "TestPass123!"}, format="json")

        assert resp.status_code == status.HTTP_200_OK

        user.refresh_from_db()
        assert user.status == "deleted"
        assert user.full_name == "Deleted User"
        assert user.phone_e164 is None
        assert user.email.startswith("deleted_")
        assert user.email.endswith("@deleted.prepgenius.invalid")
        assert user.email != original_email
        assert user.deleted_at is not None

    def test_delete_with_wrong_password_returns_400(self, auth_client):
        client, user = auth_client
        resp = client.delete(DELETE_URL, {"password": "wrong"}, format="json")

        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "Incorrect password" in resp.data["detail"]

    def test_deleted_user_cannot_log_in(self, auth_client):
        client, user = auth_client
        client.delete(DELETE_URL, {"password": "TestPass123!"}, format="json")

        login_resp = client.post(
            "/api/v1/auth/login/",
            {"email": user.email, "password": "TestPass123!"},
            format="json",
        )
        assert login_resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_without_auth_returns_401(self, api_client):
        resp = api_client.delete(DELETE_URL, {"password": "TestPass123!"}, format="json")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED
