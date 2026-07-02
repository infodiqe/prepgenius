import pytest

from accounts.tests.factories import UserFactory
from ai.generation.exceptions import DraftNotFoundError, DraftNotImportableError
from ai.generation.import_service import AIQuestionImportService
from ai.models import AIQuestionDraft, DraftStatus
from ai.tests.factories import AIQuestionDraftFactory
from exams.tests.factories import ExamFactory, SubtopicFactory
from questions.models import Question, QuestionOption
from questions.services import update_question_review_status

pytestmark = pytest.mark.django_db


def _subtopic_with_exam():
    subtopic = SubtopicFactory()
    return subtopic, subtopic.topic.subject.exam


def _import(draft, subtopic, exam, **kw):
    return AIQuestionImportService().import_draft(
        draft_id=draft.id, exam_id=exam.id, subtopic_id=subtopic.id, **kw
    )


class TestImportSuccess:
    def test_creates_question_in_review_pipeline(self):
        subtopic, exam = _subtopic_with_exam()
        user = UserFactory()
        draft = AIQuestionDraftFactory(difficulty="hard")

        result = _import(draft, subtopic, exam, created_by=user)

        question = Question.objects.get(id=result.question_id)
        assert question.origin == "ai"
        assert question.review_status == "draft"  # same initial state as manual
        assert question.difficulty == 3  # "hard" → 3
        assert question.exam_id == exam.id
        assert question.subtopic_id == subtopic.id
        assert result.review_status == "draft"
        assert result.imported_at

    def test_options_created_from_draft(self):
        subtopic, exam = _subtopic_with_exam()
        draft = AIQuestionDraftFactory()
        result = _import(draft, subtopic, exam)
        options = QuestionOption.objects.filter(question_id=result.question_id).order_by("position")
        assert options.count() == 4
        assert [o.label for o in options] == ["A", "B", "C", "D"]
        assert [o.is_correct for o in options] == [False, True, False, False]

    def test_draft_marked_imported_and_linked(self):
        subtopic, exam = _subtopic_with_exam()
        draft = AIQuestionDraftFactory()
        result = _import(draft, subtopic, exam)
        draft.refresh_from_db()
        assert draft.status == DraftStatus.IMPORTED
        assert str(draft.imported_question_id) == result.question_id
        assert draft.imported_at is not None

    def test_ai_metadata_preserved(self):
        subtopic, exam = _subtopic_with_exam()
        draft = AIQuestionDraftFactory(
            provider="groq", model="llama", tags=["algebra"]
        )
        result = _import(draft, subtopic, exam)
        # Provenance stays on the (now immutable) draft, linked to the question.
        draft.refresh_from_db()
        assert draft.provider == "groq"
        assert draft.model == "llama"
        # Topical tags carried onto the Question.
        question = Question.objects.get(id=result.question_id)
        assert question.tags == {"ai_tags": ["algebra"]}

    def test_imported_question_enters_existing_review_workflow(self):
        subtopic, exam = _subtopic_with_exam()
        draft = AIQuestionDraftFactory()
        result = _import(draft, subtopic, exam)
        # The existing review service transitions it — no AI-specific workflow.
        question = update_question_review_status(
            question_id=result.question_id, review_status="in_review"
        )
        assert question.review_status == "in_review"


class TestImportGuards:
    def test_missing_draft(self):
        import uuid

        subtopic, exam = _subtopic_with_exam()
        with pytest.raises(DraftNotFoundError):
            AIQuestionImportService().import_draft(
                draft_id=uuid.uuid4(), exam_id=exam.id, subtopic_id=subtopic.id
            )

    def test_already_imported_is_rejected(self):
        subtopic, exam = _subtopic_with_exam()
        draft = AIQuestionDraftFactory()
        _import(draft, subtopic, exam)
        with pytest.raises(DraftNotImportableError):
            _import(draft, subtopic, exam)
        # No duplicate question created.
        assert Question.objects.count() == 1

    def test_discarded_is_rejected(self):
        subtopic, exam = _subtopic_with_exam()
        draft = AIQuestionDraftFactory(status=DraftStatus.DISCARDED)
        with pytest.raises(DraftNotImportableError):
            _import(draft, subtopic, exam)
        assert Question.objects.count() == 0

    def test_subtopic_not_in_exam_raises(self):
        subtopic, _ = _subtopic_with_exam()
        other_exam = ExamFactory()
        draft = AIQuestionDraftFactory()
        with pytest.raises(ValueError):
            AIQuestionImportService().import_draft(
                draft_id=draft.id, exam_id=other_exam.id, subtopic_id=subtopic.id
            )


class TestTransactionRollback:
    def test_option_failure_rolls_back_question_and_draft(self):
        subtopic, exam = _subtopic_with_exam()
        draft = AIQuestionDraftFactory()

        def boom(**kwargs):
            raise RuntimeError("option create failed")

        service = AIQuestionImportService(create_option_fn=boom)
        with pytest.raises(RuntimeError):
            service.import_draft(
                draft_id=draft.id, exam_id=exam.id, subtopic_id=subtopic.id
            )

        assert Question.objects.count() == 0  # Question rolled back
        assert AIQuestionDraft.objects.count() == 1
        draft.refresh_from_db()
        assert draft.status == DraftStatus.GENERATED  # draft not marked imported
        assert draft.imported_question is None


class TestDefaultConstruction:
    def test_wires_real_question_services(self):
        from questions.services import create_question, create_question_option

        service = AIQuestionImportService()
        assert service._create_question is create_question
        assert service._create_option is create_question_option
