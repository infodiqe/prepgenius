"""API + permission tests for the T22 readiness endpoint."""

import pytest
from django.urls import reverse
from rest_framework import status

from analytics.tests.factories import ExamReadinessScoreFactory

URL = "/api/v1/analytics/readiness/"


@pytest.mark.django_db
class TestReadinessAPI:
    def test_reverse_route_matches_spec_path(self):
        assert reverse("analytics:readiness") == URL

    def test_provisional_when_no_score(self, student_api_client, exam):
        resp = student_api_client.get(f"{URL}?exam_id={exam.id}")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "provisional"
        assert resp.data["score"] is None
        assert resp.data["band"] == "provisional"

    def test_returns_latest_scored_readiness(self, student_api_client, exam):
        ExamReadinessScoreFactory(
            user=student_api_client.user,
            exam=exam,
            score="75.00",
            components={
                "status": "scored",
                "band": "on_track",
                "scores": {"mock_performance": 80.0},
            },
        )
        resp = student_api_client.get(f"{URL}?exam_id={exam.id}")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "scored"
        assert resp.data["score"] == "75.00"
        assert resp.data["band"] == "on_track"
        assert resp.data["components"]["scores"]["mock_performance"] == 80.0

    def test_returns_most_recent_row(self, student_api_client, exam):
        ExamReadinessScoreFactory(
            user=student_api_client.user, exam=exam, score="40.00",
            components={"status": "scored", "band": "developing"},
        )
        latest = ExamReadinessScoreFactory(
            user=student_api_client.user, exam=exam, score="88.00",
            components={"status": "scored", "band": "exam_ready"},
        )
        resp = student_api_client.get(f"{URL}?exam_id={exam.id}")
        assert resp.data["score"] == "88.00"
        assert resp.data["band"] == "exam_ready"

    # ── Validation ──
    def test_invalid_exam_id_is_400(self, student_api_client):
        resp = student_api_client.get(f"{URL}?exam_id=not-a-uuid")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_unknown_exam_id_is_404(self, student_api_client):
        resp = student_api_client.get(
            f"{URL}?exam_id=99999999-9999-9999-9999-999999999999"
        )
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_missing_exam_id_and_no_target_is_400(self, student_api_client):
        resp = student_api_client.get(URL)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    # ── Permissions / ownership ──
    def test_unauthenticated_is_401(self, anonymous_client, exam):
        resp = anonymous_client.get(f"{URL}?exam_id={exam.id}")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_does_not_leak_other_users_readiness(self, student_api_client, exam):
        # Another user's readiness for the same exam must not surface.
        ExamReadinessScoreFactory(
            exam=exam, score="95.00",
            components={"status": "scored", "band": "exam_ready"},
        )
        resp = student_api_client.get(f"{URL}?exam_id={exam.id}")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "provisional"  # requesting user has none
