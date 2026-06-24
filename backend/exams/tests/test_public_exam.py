"""T42 — public exam landing pages: selectors, serializer, API, permissions."""
import datetime

import pytest

from exams.models import Exam
from exams.selectors.exam_selectors import (
    get_public_exam_by_slug,
    list_public_exams,
)
from exams.serializers import PublicExamSerializer
from .factories import ExamFactory, SubjectFactory, TopicFactory

pytestmark = pytest.mark.django_db


def _published_exam_with_syllabus():
    exam = ExamFactory(
        code="CTET_PUB",
        name="CTET Paper II",
        slug="ctet",
        description="Central Teacher Eligibility Test.",
        target_audience="Aspiring teachers for classes VI–VIII",
        exam_date=datetime.date(2026, 12, 1),
        exam_rules={
            "mode": "Offline (OMR)",
            "duration_minutes": 150,
            "total_questions": 150,
            "total_marks": 150,
            "negative_marking": False,
        },
        is_active=True,
    )
    science = SubjectFactory(exam=exam, name="Science", position=1)
    TopicFactory(subject=science, name="Physics", position=1)
    TopicFactory(subject=science, name="Chemistry", position=2)
    maths = SubjectFactory(exam=exam, name="Mathematics", position=2)
    TopicFactory(subject=maths, name="Algebra", position=1)
    return exam


class TestSelectors:
    def test_get_public_exam_by_slug(self):
        _published_exam_with_syllabus()
        exam = get_public_exam_by_slug(slug="ctet")
        assert exam.code == "CTET_PUB"

    def test_inactive_exam_raises(self):
        ExamFactory(code="X", slug="hidden", is_active=False)
        with pytest.raises(Exam.DoesNotExist):
            get_public_exam_by_slug(slug="hidden")

    def test_unknown_slug_raises(self):
        with pytest.raises(Exam.DoesNotExist):
            get_public_exam_by_slug(slug="nope")

    def test_list_public_excludes_inactive_and_slugless(self):
        ExamFactory(code="P", slug="published", is_active=True)
        ExamFactory(code="I", slug="inactive", is_active=False)
        ExamFactory(code="N", slug=None, is_active=True)
        slugs = {e.slug for e in list_public_exams()}
        assert slugs == {"published"}


class TestSerializer:
    def test_shape(self):
        exam = _published_exam_with_syllabus()
        data = PublicExamSerializer(get_public_exam_by_slug(slug="ctet")).data

        assert data["slug"] == "ctet"
        assert data["code"] == "CTET_PUB"
        assert data["status"] == "published"
        assert data["target_audience"].startswith("Aspiring")
        assert data["exam_date"] == "2026-12-01"
        assert data["overview"]["duration_minutes"] == 150
        assert data["overview"]["total_marks"] == 150
        assert data["overview"]["mode"] == "Offline (OMR)"
        summary = {s["subject"]: s["topic_count"] for s in data["syllabus_summary"]}
        assert summary == {"Science": 2, "Mathematics": 1}


class TestAPI:
    def test_detail_returns_published_exam(self, anonymous_client):
        _published_exam_with_syllabus()
        response = anonymous_client.get("/api/v1/exams/public/ctet/")
        assert response.status_code == 200
        body = response.json()
        assert body["name"] == "CTET Paper II"
        assert body["syllabus_summary"][0]["subject"] == "Science"

    def test_inactive_returns_404(self, anonymous_client):
        ExamFactory(code="I", slug="inactive", is_active=False)
        assert (
            anonymous_client.get("/api/v1/exams/public/inactive/").status_code == 404
        )

    def test_unknown_returns_404(self, anonymous_client):
        assert anonymous_client.get("/api/v1/exams/public/nope/").status_code == 404

    def test_list_returns_only_published_with_slug(self, anonymous_client):
        ExamFactory(code="P", slug="pub", is_active=True)
        ExamFactory(code="I", slug="inactive", is_active=False)
        response = anonymous_client.get("/api/v1/exams/public/")
        assert response.status_code == 200
        slugs = {e["slug"] for e in response.json()}
        assert slugs == {"pub"}


class TestPermissions:
    def test_anonymous_can_read(self, anonymous_client):
        _published_exam_with_syllabus()
        assert anonymous_client.get("/api/v1/exams/public/ctet/").status_code == 200

    @pytest.mark.parametrize("method", ["post", "put", "patch", "delete"])
    def test_write_methods_not_allowed(self, anonymous_client, method):
        _published_exam_with_syllabus()
        response = getattr(anonymous_client, method)("/api/v1/exams/public/ctet/")
        assert response.status_code == 405
