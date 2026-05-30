import pytest
from rest_framework import status

from .factories import ExamFactory, UserFactory

pytestmark = pytest.mark.django_db

PROFILE_URL = "/api/v1/auth/profile/"


class TestGetProfile:
    def test_authenticated_user_fetches_own_profile(self, auth_client):
        client, user = auth_client
        resp = client.get(PROFILE_URL)

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["email"] == user.email
        assert resp.data["full_name"] == user.full_name
        assert resp.data["id"] == str(user.id)

    def test_unauthenticated_request_returns_401(self, api_client):
        resp = api_client.get(PROFILE_URL)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


class TestPatchProfile:
    def test_updates_only_provided_fields(self, auth_client):
        client, user = auth_client
        original_name = user.full_name

        resp = client.patch(PROFILE_URL, {"preferred_language": "hi"}, format="json")

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["preferred_language"] == "hi"
        assert resp.data["full_name"] == original_name

    def test_updates_full_name(self, auth_client):
        client, user = auth_client
        resp = client.patch(PROFILE_URL, {"full_name": "New Name"}, format="json")

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["full_name"] == "New Name"

    def test_updates_phone(self, auth_client):
        client, user = auth_client
        resp = client.patch(PROFILE_URL, {"phone_e164": "+919876543210"}, format="json")

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["phone_e164"] == "+919876543210"

    def test_clears_phone(self, auth_client):
        client, user = auth_client
        client.patch(PROFILE_URL, {"phone_e164": ""}, format="json")
        resp = client.get(PROFILE_URL)
        assert resp.data["phone_e164"] is None

    def test_invalid_exam_id_returns_400(self, auth_client):
        import uuid

        client, user = auth_client
        resp = client.patch(PROFILE_URL, {"target_exam_id": str(uuid.uuid4())}, format="json")

        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_valid_exam_id_updates_profile(self, auth_client):
        exam = ExamFactory()
        client, user = auth_client
        resp = client.patch(PROFILE_URL, {"target_exam_id": str(exam.id)}, format="json")

        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["target_exam_id"] == exam.id

    def test_users_cannot_update_each_other(self, api_client):
        user1 = UserFactory(verified=True)
        user2 = UserFactory(verified=True)

        from rest_framework_simplejwt.tokens import RefreshToken

        refresh = RefreshToken.for_user(user1)
        api_client.cookies["access_token"] = str(refresh.access_token)

        resp = api_client.patch(PROFILE_URL, {"full_name": "Hacked Name"}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["full_name"] == "Hacked Name"

        user2.refresh_from_db()
        assert user2.full_name != "Hacked Name"
