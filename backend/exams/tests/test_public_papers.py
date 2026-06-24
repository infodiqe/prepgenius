"""T44 — public previous-year-papers: selector, serializer, API, permissions."""
import pytest

from exams.models import Exam
from exams.selectors.exam_selectors import get_public_exam_papers
from exams.serializers import PublicExamPapersSerializer
from .factories import ExamFactory, PreviousYearPaperFactory

pytestmark = pytest.mark.django_db


def _exam_with_papers():
    exam = ExamFactory(code="CTET_PYP", name="CTET Paper II", slug="ctet", is_active=True)
    PreviousYearPaperFactory(exam=exam, code="P2023", year=2023, total_questions=150)
    PreviousYearPaperFactory(exam=exam, code="P2024", year=2024, total_questions=0)
    return exam


class TestSelector:
    def test_returns_exam_and_papers_newest_first(self):
        _exam_with_papers()
        exam, papers = get_public_exam_papers(slug="ctet")
        assert exam.slug == "ctet"
        assert [p.year for p in papers] == [2024, 2023]

    def test_inactive_raises(self):
        ExamFactory(code="I", slug="inactive", is_active=False)
        with pytest.raises(Exam.DoesNotExist):
            get_public_exam_papers(slug="inactive")

    def test_unknown_raises(self):
        with pytest.raises(Exam.DoesNotExist):
            get_public_exam_papers(slug="nope")


class TestSerializer:
    def test_shape_and_available_flag(self):
        _exam_with_papers()
        exam, papers = get_public_exam_papers(slug="ctet")
        data = PublicExamPapersSerializer({"exam": exam, "papers": papers}).data

        assert data["exam"] == {"slug": "ctet", "name": "CTET Paper II"}
        by_year = {p["year"]: p for p in data["papers"]}
        assert by_year[2023]["question_count"] == 150
        assert by_year[2023]["available"] is True
        assert by_year[2024]["available"] is False
        assert by_year[2023]["title"] == "2023 Question Paper"


class TestAPI:
    def test_returns_papers(self, anonymous_client):
        _exam_with_papers()
        response = anonymous_client.get(
            "/api/v1/exams/public/ctet/previous-year-papers/"
        )
        assert response.status_code == 200
        body = response.json()
        assert body["exam"]["name"] == "CTET Paper II"
        assert len(body["papers"]) == 2

    def test_inactive_returns_404(self, anonymous_client):
        ExamFactory(code="I", slug="inactive", is_active=False)
        response = anonymous_client.get(
            "/api/v1/exams/public/inactive/previous-year-papers/"
        )
        assert response.status_code == 404

    def test_unknown_returns_404(self, anonymous_client):
        response = anonymous_client.get(
            "/api/v1/exams/public/nope/previous-year-papers/"
        )
        assert response.status_code == 404


class TestPermissions:
    def test_anonymous_can_read(self, anonymous_client):
        _exam_with_papers()
        response = anonymous_client.get(
            "/api/v1/exams/public/ctet/previous-year-papers/"
        )
        assert response.status_code == 200

    @pytest.mark.parametrize("method", ["post", "put", "patch", "delete"])
    def test_write_methods_not_allowed(self, anonymous_client, method):
        _exam_with_papers()
        response = getattr(anonymous_client, method)(
            "/api/v1/exams/public/ctet/previous-year-papers/"
        )
        assert response.status_code == 405
