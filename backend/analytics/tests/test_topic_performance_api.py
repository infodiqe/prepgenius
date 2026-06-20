"""Tests for the T23 Topic Mastery API and serializer."""

from decimal import Decimal

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from analytics.api.serializers import UserTopicPerformanceSerializer
from analytics.tests.factories import UserTopicPerformanceFactory
from attempts.tests.factories import (
    ExamFactory,
    SubjectFactory,
    SubtopicFactory,
    TopicFactory,
)

URL = "/api/v1/analytics/topic-performance/"


def _topic(exam, name="Physics"):
    subject = SubjectFactory(exam=exam)
    return TopicFactory(subject=subject, name=name)


# ── Serializer ────────────────────────────────────────────────────────────────


class TestUserTopicPerformanceSerializer:
    def test_serializes_all_required_fields(self):
        now = timezone.now()
        payload = {
            "topic_id": "11111111-1111-1111-1111-111111111111",
            "topic_name": "Physics",
            "attempts": 5,
            "correct": 4,
            "success_rate": Decimal("80.00"),
            "avg_time": Decimal("32.20"),
            "last_practiced_at": now,
        }
        data = UserTopicPerformanceSerializer(payload).data
        assert data["topic_id"] == "11111111-1111-1111-1111-111111111111"
        assert data["topic_name"] == "Physics"
        assert data["attempts"] == 5
        assert data["correct"] == 4
        assert data["success_rate"] == "80.00"
        assert data["avg_time"] == "32.20"
        assert data["last_practiced_at"] is not None

    def test_allows_null_last_practiced_at(self):
        data = UserTopicPerformanceSerializer(
            {
                "topic_id": "11111111-1111-1111-1111-111111111111",
                "topic_name": "T",
                "attempts": 0,
                "correct": 0,
                "success_rate": Decimal("0.00"),
                "avg_time": Decimal("0.00"),
                "last_practiced_at": None,
            }
        ).data
        assert data["last_practiced_at"] is None


# ── API ─────────────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestTopicPerformanceAPI:
    def test_reverse_route_matches_spec_path(self):
        assert reverse("analytics:topic-performance") == URL

    def test_returns_own_topic_performance(self, student_api_client, exam):
        topic = _topic(exam)
        UserTopicPerformanceFactory(
            user=student_api_client.user,
            exam=exam,
            topic=topic,
            attempts=5,
            correct=4,
            success_rate=Decimal("80.00"),
            avg_time=Decimal("32.20"),
        )

        resp = student_api_client.get(f"{URL}?exam_id={exam.id}")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1
        row = resp.data[0]
        assert row["topic_id"] == str(topic.id)
        assert row["topic_name"] == topic.name
        assert row["attempts"] == 5
        assert row["correct"] == 4
        assert row["success_rate"] == "80.00"
        assert row["avg_time"] == "32.20"
        assert "last_practiced_at" in row

    def test_falls_back_to_target_exam_when_exam_id_omitted(
        self, student_api_client, exam
    ):
        student_api_client.user.target_exam = exam
        student_api_client.user.save(update_fields=["target_exam"])
        topic = _topic(exam)
        UserTopicPerformanceFactory(
            user=student_api_client.user, exam=exam, topic=topic
        )

        resp = student_api_client.get(URL)
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1

    def test_empty_state_returns_empty_list(self, student_api_client, exam):
        resp = student_api_client.get(f"{URL}?exam_id={exam.id}")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data == []

    # ── Validation ──
    def test_missing_exam_id_and_no_target_is_400(self, student_api_client):
        resp = student_api_client.get(URL)
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_exam_id_is_400(self, student_api_client):
        resp = student_api_client.get(f"{URL}?exam_id=not-a-uuid")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_unknown_exam_id_is_404(self, student_api_client):
        resp = student_api_client.get(
            f"{URL}?exam_id=99999999-9999-9999-9999-999999999999"
        )
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    # ── Permissions / ownership ──
    def test_unauthenticated_is_401(self, anonymous_client, exam):
        resp = anonymous_client.get(f"{URL}?exam_id={exam.id}")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_only_returns_requesting_users_data(self, student_api_client, exam):
        """Another student's topic performance must never leak through."""
        other_exam_topic = _topic(exam, name="Chemistry")
        other = UserTopicPerformanceFactory(
            exam=exam, topic=other_exam_topic
        )  # belongs to a different (factory) user
        assert other.user_id != student_api_client.user.id

        resp = student_api_client.get(f"{URL}?exam_id={exam.id}")
        assert resp.status_code == status.HTTP_200_OK
        # Requesting user has no rows of their own → empty, despite another
        # user's row existing for the same exam.
        assert resp.data == []
