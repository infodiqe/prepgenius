"""
Reviewer-assistance workspace tests (Sprint-6B-03, Tasks 10–11).

The existing Draft Management Workspace endpoints are extended (not redesigned) to
surface quality badges + report and to filter by quality signals. Backend only —
no editing / approval / publish here.
"""
import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import Role, UserRole
from accounts.tests.factories import UserFactory
from ai.tests.factories import AIQuestionDraftFactory

pytestmark = pytest.mark.django_db

LIST_URL = reverse("ai:draft-list")


def _client_with_role(role_name):
    user = UserFactory(verified=True)
    if role_name:
        role, _ = Role.objects.get_or_create(
            name=role_name, defaults={"description": role_name, "is_system": True}
        )
        UserRole.objects.create(user=user, role=role)
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def _detail_url(draft_id):
    return reverse("ai:draft-detail", kwargs={"draft_id": draft_id})


class TestWorkspaceBadges:
    def test_list_exposes_quality_badges(self):
        AIQuestionDraftFactory(analysed=True)
        client, _ = _client_with_role("content_manager")
        row = client.get(LIST_URL).json()["results"][0]
        for key in (
            "quality_score",
            "quality_grade",
            "duplicate_status",
            "alignment_status",
            "bloom_match",
            "difficulty_match",
        ):
            assert key in row
        assert row["quality_grade"] == "B"
        assert row["duplicate_status"] == "unique"

    def test_detail_exposes_expandable_report(self):
        report = {
            "quality_score": 72,
            "warnings": [{"code": "weak_alignment", "message": "Weak."}],
            "recommendations": ["Verify the topic."],
            "strengths": ["No duplicates found."],
        }
        draft = AIQuestionDraftFactory(
            analysed=True, quality_score=72, quality_grade="C", quality_report=report
        )
        client, _ = _client_with_role("content_manager")
        body = client.get(_detail_url(draft.id)).json()
        assert body["quality_score"] == 72
        assert body["quality_grade"] == "C"
        assert body["quality_report"]["recommendations"] == ["Verify the topic."]
        assert body["quality_report"]["warnings"][0]["code"] == "weak_alignment"
        assert body["analysis_provider"] == "rule_based"


class TestQualityFilters:
    def _seed(self):
        AIQuestionDraftFactory(
            exam="CTET", quality_grade="A", duplicate_status="unique",
            alignment_status="aligned", difficulty_match="match", bloom_match="match",
        )
        AIQuestionDraftFactory(
            exam="CTET", quality_grade="F", duplicate_status="exact_duplicate",
            alignment_status="misaligned", difficulty_match="mismatch", bloom_match="higher",
        )

    def test_filter_by_grade(self):
        self._seed()
        client, _ = _client_with_role("content_manager")
        assert client.get(LIST_URL, {"quality_grade": "A"}).json()["count"] == 1

    def test_filter_by_duplicate_status(self):
        self._seed()
        client, _ = _client_with_role("content_manager")
        assert client.get(LIST_URL, {"duplicate_status": "exact_duplicate"}).json()["count"] == 1

    def test_filter_by_alignment(self):
        self._seed()
        client, _ = _client_with_role("content_manager")
        assert client.get(LIST_URL, {"alignment_status": "aligned"}).json()["count"] == 1

    def test_filter_by_difficulty_match(self):
        self._seed()
        client, _ = _client_with_role("content_manager")
        assert client.get(LIST_URL, {"difficulty_match": "match"}).json()["count"] == 1

    def test_filter_by_bloom_match(self):
        self._seed()
        client, _ = _client_with_role("content_manager")
        assert client.get(LIST_URL, {"bloom_match": "higher"}).json()["count"] == 1

    def test_combined_filters(self):
        self._seed()
        client, _ = _client_with_role("content_manager")
        resp = client.get(LIST_URL, {"quality_grade": "A", "duplicate_status": "unique"})
        assert resp.json()["count"] == 1


class TestPermissions:
    def test_student_forbidden(self):
        AIQuestionDraftFactory(analysed=True)
        client, _ = _client_with_role("student")
        assert client.get(LIST_URL).status_code == 403

    def test_unauthenticated(self):
        assert APIClient().get(LIST_URL).status_code == 401
