"""
Taxonomy suggestions + accept API tests (Sprint-6C-01, Task 8 + permissions)."""
import uuid

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import Role, UserRole
from accounts.tests.factories import UserFactory
from ai.models import AITaxonomyResolution, DraftStatus
from ai.tests.factories import AIQuestionDraftFactory
from exams.tests.factories import ExamFactory, SubjectFactory, SubtopicFactory, TopicFactory
from questions.models import Question

pytestmark = pytest.mark.django_db


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


def _taxonomy():
    exam = ExamFactory(code="CTET", name="Central Teacher Eligibility Test")
    subject = SubjectFactory(exam=exam, name="Mathematics")
    topic = TopicFactory(subject=subject, name="Fractions")
    subtopic = SubtopicFactory(topic=topic, name="Addition")
    return exam, subject, topic, subtopic


def _draft():
    return AIQuestionDraftFactory(
        exam="CTET", subject="Mathematics", topic="Fractions", subtopic="Addition"
    )


def _sugg_url(draft_id):
    return reverse("ai:taxonomy-suggestions", args=[draft_id])


def _accept_url(draft_id):
    return reverse("ai:taxonomy-accept", args=[draft_id])


class TestSuggestions:
    def test_returns_suggestions_and_duplicates(self):
        _taxonomy()
        draft = _draft()
        client, _ = _client_with_role("content_manager")
        resp = client.get(_sugg_url(draft.id))
        assert resp.status_code == 200
        body = resp.json()
        assert body["exam"]["confidence"] == "exact"
        assert body["suggested_subtopic_id"]
        assert "duplicates" in body
        assert body["subtopic"]["best"]["label"] == "Addition"

    def test_missing_draft_404(self):
        client, _ = _client_with_role("content_manager")
        assert client.get(_sugg_url(uuid.uuid4())).status_code == 404

    def test_student_forbidden(self):
        draft = _draft()
        client, _ = _client_with_role("student")
        assert client.get(_sugg_url(draft.id)).status_code == 403

    def test_unauthenticated_401(self):
        draft = _draft()
        assert APIClient().get(_sugg_url(draft.id)).status_code == 401


class TestAccept:
    def test_accept_imports_and_audits_201(self):
        exam, subject, topic, subtopic = _taxonomy()
        draft = _draft()
        client, user = _client_with_role("content_manager")

        resp = client.post(
            _accept_url(draft.id),
            {"exam_id": str(exam.id), "subtopic_id": str(subtopic.id)},
            format="json",
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["imported"]["origin"] == "ai"
        assert body["audit"]["is_override"] is False
        assert body["audit"]["confidence"] == "exact"

        question = Question.objects.get(id=body["imported"]["question_id"])
        assert question.exam_id == exam.id and question.subtopic_id == subtopic.id
        draft.refresh_from_db()
        assert draft.status == DraftStatus.IMPORTED
        assert AITaxonomyResolution.objects.filter(draft=draft).count() == 1

    def test_override_recorded(self):
        exam, subject, topic, subtopic = _taxonomy()
        other = SubtopicFactory(topic=topic, name="Subtraction")
        draft = _draft()
        client, _ = _client_with_role("content_manager")

        resp = client.post(
            _accept_url(draft.id),
            {"exam_id": str(exam.id), "subtopic_id": str(other.id)},
            format="json",
        )
        assert resp.status_code == 201
        assert resp.json()["audit"]["is_override"] is True

    def test_already_imported_409(self):
        exam, subject, topic, subtopic = _taxonomy()
        draft = _draft()
        client, _ = _client_with_role("content_manager")
        body = {"exam_id": str(exam.id), "subtopic_id": str(subtopic.id)}
        assert client.post(_accept_url(draft.id), body, format="json").status_code == 201
        # Second accept on the now-imported draft is a conflict.
        assert client.post(_accept_url(draft.id), body, format="json").status_code == 409

    def test_bad_subtopic_reference_400(self):
        exam, subject, topic, subtopic = _taxonomy()
        other_exam = ExamFactory(code="OTHER", name="Other")
        draft = _draft()
        client, _ = _client_with_role("content_manager")
        resp = client.post(
            _accept_url(draft.id),
            {"exam_id": str(other_exam.id), "subtopic_id": str(subtopic.id)},
            format="json",
        )
        assert resp.status_code == 400
        assert AITaxonomyResolution.objects.count() == 0

    def test_student_forbidden(self):
        exam, subject, topic, subtopic = _taxonomy()
        draft = _draft()
        client, _ = _client_with_role("student")
        resp = client.post(
            _accept_url(draft.id),
            {"exam_id": str(exam.id), "subtopic_id": str(subtopic.id)},
            format="json",
        )
        assert resp.status_code == 403
