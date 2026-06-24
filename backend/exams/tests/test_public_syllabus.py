"""T43 — public exam syllabus: selector, serializer, API, permissions."""
import pytest

from exams.models import Exam
from exams.selectors.exam_selectors import get_public_exam_syllabus
from exams.serializers import PublicSyllabusSerializer
from .factories import (
    ExamFactory,
    SubjectFactory,
    SubtopicFactory,
    TopicFactory,
)

pytestmark = pytest.mark.django_db


def _exam_with_tree():
    exam = ExamFactory(code="CTET_SYL", name="CTET Paper II", slug="ctet", is_active=True)
    science = SubjectFactory(exam=exam, name="Science", position=1)
    physics = TopicFactory(subject=science, name="Physics", position=1)
    SubtopicFactory(topic=physics, name="Motion", position=1)
    SubtopicFactory(topic=physics, name="Force", position=2)
    SubjectFactory(exam=exam, name="Mathematics", position=2)
    return exam


class TestSelector:
    def test_returns_exam_and_subject_tree(self):
        _exam_with_tree()
        exam, subjects = get_public_exam_syllabus(slug="ctet")
        assert exam.slug == "ctet"
        names = [s.name for s in subjects]
        assert names == ["Science", "Mathematics"]

    def test_inactive_raises(self):
        ExamFactory(code="I", slug="inactive", is_active=False)
        with pytest.raises(Exam.DoesNotExist):
            get_public_exam_syllabus(slug="inactive")

    def test_unknown_raises(self):
        with pytest.raises(Exam.DoesNotExist):
            get_public_exam_syllabus(slug="nope")


class TestSerializer:
    def test_nested_shape(self):
        _exam_with_tree()
        exam, subjects = get_public_exam_syllabus(slug="ctet")
        data = PublicSyllabusSerializer({"exam": exam, "subjects": subjects}).data

        assert data["exam"] == {"slug": "ctet", "name": "CTET Paper II"}
        science = data["subjects"][0]
        assert science["name"] == "Science"
        physics = science["topics"][0]
        assert physics["name"] == "Physics"
        assert [s["name"] for s in physics["subtopics"]] == ["Motion", "Force"]


class TestAPI:
    def test_returns_syllabus(self, anonymous_client):
        _exam_with_tree()
        response = anonymous_client.get("/api/v1/exams/public/ctet/syllabus/")
        assert response.status_code == 200
        body = response.json()
        assert body["exam"]["name"] == "CTET Paper II"
        assert body["subjects"][0]["topics"][0]["subtopics"][0]["name"] == "Motion"

    def test_inactive_returns_404(self, anonymous_client):
        ExamFactory(code="I", slug="inactive", is_active=False)
        response = anonymous_client.get("/api/v1/exams/public/inactive/syllabus/")
        assert response.status_code == 404

    def test_unknown_returns_404(self, anonymous_client):
        assert (
            anonymous_client.get("/api/v1/exams/public/nope/syllabus/").status_code
            == 404
        )


class TestPermissions:
    def test_anonymous_can_read(self, anonymous_client):
        _exam_with_tree()
        assert (
            anonymous_client.get("/api/v1/exams/public/ctet/syllabus/").status_code
            == 200
        )

    @pytest.mark.parametrize("method", ["post", "put", "patch", "delete"])
    def test_write_methods_not_allowed(self, anonymous_client, method):
        _exam_with_tree()
        response = getattr(anonymous_client, method)(
            "/api/v1/exams/public/ctet/syllabus/"
        )
        assert response.status_code == 405
