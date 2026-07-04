"""
Quality persistence + duplicate-corpus tests (Sprint-6B-03, Tasks 2 & 9).

Exercises the real QuestionDraftService wiring (generation stubbed) so the quality
report is computed after validation and persisted on the AIQuestionDraft, and the
real duplicate corpus (published / imported-AI questions + other drafts).
"""
import pytest

from ai.generation.draft_service import QuestionDraftService
from ai.generation.service import QuestionGenerationService
from ai.models import AIQuestionDraft
from ai.selectors import get_duplicate_candidates
from ai.tests.factories import AIQuestionDraftFactory
from ai.tests.generation_utils import make_request, make_result, valid_json
from questions.tests.factories import QuestionFactory

pytestmark = pytest.mark.django_db


def _draft_service(stem="A unique question about counting apples in a basket."):
    gen = QuestionGenerationService(
        generate_fn=lambda **kw: make_result(text=valid_json(count=1, stem=stem))
    )
    return QuestionDraftService(generation_service=gen)


class TestPersistQualityReport:
    def test_generate_draft_persists_quality_metadata(self):
        service = _draft_service()
        result = service.generate_draft(make_request(count=1, exam="CTET"))
        assert result.saved_count == 1

        draft = AIQuestionDraft.objects.get()
        assert draft.quality_score is not None
        assert draft.quality_grade in {"A", "B", "C", "D", "F"}
        assert draft.duplicate_status == "unique"  # empty corpus
        assert draft.alignment_status
        assert draft.bloom_match
        assert draft.difficulty_match in {"match", "mismatch"}
        assert draft.analysis_provider == "rule_based"
        assert draft.analysis_version == "1.0"
        assert draft.analysed_at is not None
        # Full structured report is stored verbatim.
        assert draft.quality_report["quality_score"] == draft.quality_score
        assert "duplicate" in draft.quality_report and "alignment" in draft.quality_report

    def test_analysis_never_rejects_valid_draft(self):
        # Even a low-quality (but valid) question is still persisted as a draft.
        service = _draft_service(stem="x")  # misaligned/short → low score, still saved
        result = service.generate_draft(
            make_request(count=1, exam="CTET", topic="Photosynthesis")
        )
        assert result.saved_count == 1
        assert AIQuestionDraft.objects.count() == 1


class TestDuplicateAgainstCorpus:
    def test_flags_duplicate_of_published_question(self):
        shared = "What is the boiling point of water at sea level in Celsius?"
        QuestionFactory(exam__code="CTET", stem=shared, published=True)

        service = _draft_service(stem=shared)
        service.generate_draft(make_request(count=1, exam="CTET"))

        draft = AIQuestionDraft.objects.get()
        assert draft.duplicate_status in {"exact_duplicate", "near_duplicate"}
        report = draft.quality_report["duplicate"]
        assert report["most_similar_ids"]
        assert report["similarity_pct"] >= 60.0


class TestDuplicateCorpusSelector:
    def test_collects_published_ai_and_drafts_scoped_by_exam(self):
        published = QuestionFactory(exam__code="CTET", stem="Published stem", published=True)
        ai_q = QuestionFactory(exam__code="CTET", stem="Imported AI stem", ai=True)
        QuestionFactory(exam__code="OTHER", stem="Different exam", published=True)
        draft = AIQuestionDraftFactory(exam="CTET", stem="Draft stem")

        entries = get_duplicate_candidates(exam="CTET")
        by_id = {e.question_id: e for e in entries}
        assert str(published.id) in by_id and by_id[str(published.id)].kind == "published"
        assert str(ai_q.id) in by_id and by_id[str(ai_q.id)].kind == "imported_ai"
        assert str(draft.id) in by_id and by_id[str(draft.id)].kind == "draft"
        # Other-exam question is excluded.
        assert all(e.stem != "Different exam" for e in entries)

    def test_excludes_self_draft(self):
        draft = AIQuestionDraftFactory(exam="CTET", stem="Self stem")
        entries = get_duplicate_candidates(exam="CTET", exclude_draft_id=draft.id)
        assert str(draft.id) not in {e.question_id for e in entries}
