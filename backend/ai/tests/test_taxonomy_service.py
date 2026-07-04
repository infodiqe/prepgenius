"""
AITaxonomyResolutionService tests (Sprint-6C-01).

Deterministic taxonomy matching (no AI), duplicate reuse, and accept → import with
append-only audit. Real taxonomy fixtures; no live AI.
"""
import uuid

import pytest

from accounts.tests.factories import UserFactory
from ai.generation.exceptions import DraftNotFoundError
from ai.models import AIQuestionDraft, AITaxonomyResolution, DraftStatus
from ai.taxonomy import AITaxonomyResolutionService
from ai.tests.factories import AIQuestionDraftFactory
from exams.tests.factories import (
    ExamFactory,
    SubjectFactory,
    SubtopicFactory,
    TopicFactory,
)
from questions.models import Question
from questions.tests.factories import QuestionFactory

pytestmark = pytest.mark.django_db


def _taxonomy(exam_code="CTET"):
    exam = ExamFactory(code=exam_code, name="Central Teacher Eligibility Test")
    subject = SubjectFactory(exam=exam, name="Mathematics")
    topic = TopicFactory(subject=subject, name="Fractions")
    subtopic = SubtopicFactory(topic=topic, name="Addition")
    return exam, subject, topic, subtopic


def _matched_draft(**kw):
    defaults = dict(exam="CTET", subject="Mathematics", topic="Fractions", subtopic="Addition")
    defaults.update(kw)
    return AIQuestionDraftFactory(**defaults)


class TestResolveExact:
    def test_exact_cascade(self):
        exam, subject, topic, subtopic = _taxonomy()
        draft = _matched_draft()

        res = AITaxonomyResolutionService().resolve(draft=draft)

        assert res.exam.confidence == "exact"
        assert res.exam.best.id == str(exam.id)
        assert res.subject.best.id == str(subject.id)
        assert res.topic.best.id == str(topic.id)
        assert res.subtopic.best.id == str(subtopic.id)
        assert res.overall_confidence == "exact"
        assert res.suggested_exam_id == str(exam.id)
        assert res.suggested_subtopic_id == str(subtopic.id)

    def test_exam_matches_on_code(self):
        exam, *_ = _taxonomy(exam_code="SSC")
        draft = _matched_draft(exam="ssc")  # case-insensitive
        res = AITaxonomyResolutionService().resolve(draft=draft)
        assert res.exam.confidence == "exact"
        assert res.exam.best.id == str(exam.id)


class TestResolvePartialAndNoMatch:
    def test_partial_exam(self):
        _taxonomy(exam_code="CTET")  # name "Central Teacher Eligibility Test"
        draft = _matched_draft(exam="Central Teacher Eligibility")  # near name, not exact
        res = AITaxonomyResolutionService().resolve(draft=draft)
        assert res.exam.confidence == "partial"
        assert len(res.exam.matches) >= 1

    def test_no_match_stops_cascade(self):
        _taxonomy()
        draft = _matched_draft(exam="Nonexistent Zoology Olympiad")
        res = AITaxonomyResolutionService().resolve(draft=draft)
        assert res.exam.confidence == "no_match"
        # Children cannot be scoped without an exam.
        assert res.subject.confidence == "no_match"
        assert res.subtopic.confidence == "no_match"
        assert res.overall_confidence == "no_match"
        assert res.suggested_exam_id is None
        assert res.suggested_subtopic_id is None

    def test_top_matches_capped_at_five(self):
        exam = ExamFactory(code="CTET", name="Central Teacher Eligibility Test")
        subject = SubjectFactory(exam=exam, name="Mathematics")
        topic = TopicFactory(subject=subject, name="Fractions")
        for i in range(8):
            SubtopicFactory(topic=topic, name=f"Addition variant {i}")
        draft = _matched_draft(subtopic="Addition")
        res = AITaxonomyResolutionService().resolve(draft=draft)
        assert len(res.subtopic.matches) <= 5

    def test_missing_subtopic_query_is_no_match(self):
        _taxonomy()
        draft = _matched_draft(subtopic=None)
        res = AITaxonomyResolutionService().resolve(draft=draft)
        assert res.subtopic.confidence == "no_match"
        assert res.suggested_subtopic_id is None


class TestDuplicates:
    def test_duplicate_detected_before_import(self):
        _taxonomy()
        shared = "What is the boiling point of water at sea level in Celsius?"
        QuestionFactory(exam__code="CTET", stem=shared, published=True)
        draft = _matched_draft(stem=shared)

        res = AITaxonomyResolutionService().resolve(draft=draft)
        assert res.duplicates["classification"] in {"exact_duplicate", "near_duplicate"}
        assert res.duplicates["most_similar_ids"]

    def test_unique_draft_has_no_duplicates(self):
        _taxonomy()
        draft = _matched_draft(stem="A totally unique question about counting apples.")
        res = AITaxonomyResolutionService().resolve(draft=draft)
        assert res.duplicates["classification"] == "unique"


class TestAcceptAndImport:
    def test_accept_suggestion_imports_and_audits(self):
        exam, subject, topic, subtopic = _taxonomy()
        user = UserFactory()
        draft = _matched_draft()

        outcome = AITaxonomyResolutionService().accept_and_import(
            draft_id=draft.id, exam_id=exam.id, subtopic_id=subtopic.id, created_by=user
        )

        # Reused import service created the Question in the existing pipeline.
        question = Question.objects.get(id=outcome.import_result.question_id)
        assert question.origin == "ai" and question.review_status == "draft"
        draft.refresh_from_db()
        assert draft.status == DraftStatus.IMPORTED

        audit = outcome.audit
        assert audit.chosen_exam_id == exam.id
        assert audit.chosen_subtopic_id == subtopic.id
        assert str(audit.suggested_subtopic_id) == str(subtopic.id)
        assert audit.is_override is False  # accepted the suggestion
        assert audit.confidence == "exact"
        assert str(audit.imported_question_id) == outcome.import_result.question_id
        assert audit.created_by == user
        assert audit.suggestion["overall_confidence"] == "exact"
        assert "exact" in str(audit)

    def test_override_flagged(self):
        exam, subject, topic, subtopic = _taxonomy()
        other_subtopic = SubtopicFactory(topic=topic, name="Subtraction")
        draft = _matched_draft()  # suggests "Addition" subtopic

        outcome = AITaxonomyResolutionService().accept_and_import(
            draft_id=draft.id, exam_id=exam.id, subtopic_id=other_subtopic.id
        )
        assert outcome.audit.is_override is True
        assert outcome.audit.chosen_subtopic_id == other_subtopic.id
        assert outcome.audit.suggested_subtopic_id == str(subtopic.id)

    def test_missing_draft_raises(self):
        exam, _, _, subtopic = _taxonomy()
        with pytest.raises(DraftNotFoundError):
            AITaxonomyResolutionService().accept_and_import(
                draft_id=uuid.uuid4(), exam_id=exam.id, subtopic_id=subtopic.id
            )

    def test_bad_subtopic_rolls_back_no_audit(self):
        exam, subject, topic, subtopic = _taxonomy()
        other_exam = ExamFactory(code="OTHER", name="Other")
        draft = _matched_draft()

        with pytest.raises(ValueError):
            AITaxonomyResolutionService().accept_and_import(
                draft_id=draft.id, exam_id=other_exam.id, subtopic_id=subtopic.id
            )
        # Nothing imported, no audit written (transaction rolled back).
        assert AITaxonomyResolution.objects.count() == 0
        assert Question.objects.count() == 0
        draft.refresh_from_db()
        assert draft.status == DraftStatus.GENERATED
