"""AUTH-HOTFIX-01 end-to-end regression (D).

Register a user via the REAL registration service (no UserRoleFactory),
authenticate, and run the full attempt lifecycle — proving no IsStudent 403
occurs anywhere now that registration assigns the student role.
"""
from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.services.registration import create_user


def _real_registered_client():
    """APIClient authenticated as a user created via the real registration
    service (which now assigns the global student role)."""
    with patch("accounts.services.registration.send_verification_email.delay"):
        user = create_user(
            email="e2e.student@example.com",
            full_name="E2E Student",
            password="Str0ng!Pass",
        )
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.cookies["access_token"] = str(refresh.access_token)
    client.cookies["refresh_token"] = str(refresh)
    return client, user


class TestRegistrationToAttemptFlow:
    def test_real_registered_user_completes_attempt_lifecycle(
        self, seed_roles, exam, mock_test_with_questions
    ):
        client, _user = _real_registered_client()

        # Create
        create_resp = client.post(
            reverse("attempts:attempt-list"),
            {
                "exam_id": str(exam.id),
                "attempt_type": "full_mock",
                "mock_test_id": str(mock_test_with_questions.id),
            },
            format="json",
        )
        assert create_resp.status_code == status.HTTP_201_CREATED
        attempt_id = create_resp.data["id"]

        # Start
        start_resp = client.post(
            reverse("attempts:attempt-start", kwargs={"pk": attempt_id})
        )
        assert start_resp.status_code == status.HTTP_200_OK
        assert start_resp.data["status"] == "in_progress"

        # Submit (auto-scores)
        submit_resp = client.post(
            reverse("attempts:attempt-submit", kwargs={"pk": attempt_id})
        )
        assert submit_resp.status_code == status.HTTP_200_OK
        assert submit_resp.data["status"] == "scored"

        # View results
        results_resp = client.get(
            reverse("attempts:attempt-results", kwargs={"pk": attempt_id})
        )
        assert results_resp.status_code == status.HTTP_200_OK

        # View analytics
        analytics_resp = client.get(
            reverse("attempts:attempt-analytics", kwargs={"pk": attempt_id})
        )
        assert analytics_resp.status_code == status.HTTP_200_OK

        # No IsStudent 403 anywhere across the gated lifecycle.
        for resp in (
            create_resp,
            start_resp,
            submit_resp,
            results_resp,
            analytics_resp,
        ):
            assert resp.status_code != status.HTTP_403_FORBIDDEN
