import json

import pytest

from accounts.tests.factories import UserFactory
from ai.generation.draft_service import QuestionDraftService
from ai.generation.exceptions import ProviderUnavailableError, UnsupportedQuestionTypeError
from ai.generation.service import QuestionGenerationService
from ai.models import AIQuestionDraft, DraftStatus
from ai.tests.generation_utils import make_request, make_result, question_dict, valid_json
from ai.validation import QuestionValidationService

pytestmark = pytest.mark.django_db


def _draft_service(result):
    gen = QuestionGenerationService(generate_fn=lambda **kw: result)
    return QuestionDraftService(
        generation_service=gen, validation_service=QuestionValidationService()
    )


class TestPersistValidDrafts:
    def test_all_valid_are_saved(self):
        user = UserFactory()
        service = _draft_service(make_result(text=valid_json(count=2)))
        result = service.generate_draft(make_request(count=2), created_by=user)

        assert result.saved_count == 2
        assert result.rejected_count == 0
        assert AIQuestionDraft.objects.count() == 2
        draft = AIQuestionDraft.objects.first()
        assert draft.status == DraftStatus.GENERATED
        assert draft.created_by == user
        assert draft.provider == "mock"
        assert draft.model == "mock-model"
        assert draft.validation_report["valid"] is True
        assert draft.exam == "CTET"

    def test_result_metadata_propagated(self):
        service = _draft_service(make_result(text=valid_json(), request_id="req-123"))
        result = service.generate_draft(make_request(count=1))
        assert result.provider == "mock"
        assert result.model == "mock-model"
        assert result.request_id == "req-123"
        assert result.drafts[0].id

    def test_persists_normalized_content(self):
        payload = {
            "questions": [
                question_dict(
                    stem="**What** is <b>2+2</b>?",
                    difficulty="Easy",
                    tags=["Math", "math", "algebra"],
                )
            ]
        }
        service = _draft_service(make_result(text=json.dumps(payload)))
        service.generate_draft(make_request(count=1))
        draft = AIQuestionDraft.objects.get()
        assert draft.stem == "What is 2+2?"  # markdown/html stripped
        assert draft.difficulty == "easy"  # synonym normalized
        assert draft.tags == ["algebra", "Math"]  # deduped + sorted

    def test_generation_prompt_recorded(self):
        service = _draft_service(make_result(text=valid_json()))
        service.generate_draft(make_request(count=1))
        draft = AIQuestionDraft.objects.get()
        assert "CTET" in draft.generation_prompt
        assert "JSON" in draft.generation_prompt


class TestRejectedNeverSaved:
    def test_invalid_questions_not_persisted(self):
        payload = {
            "questions": [
                question_dict(),  # valid
                question_dict(explanation=""),  # invalid → rejected
            ]
        }
        service = _draft_service(make_result(text=json.dumps(payload)))
        result = service.generate_draft(make_request(count=2))

        assert result.saved_count == 1
        assert result.rejected_count == 1
        assert AIQuestionDraft.objects.count() == 1
        assert result.rejected[0].valid is False
        assert any(e.code == "explanation_missing" for e in result.rejected[0].errors)

    def test_all_invalid_saves_nothing(self):
        payload = {"questions": [question_dict(learning_objective="") for _ in range(3)]}
        service = _draft_service(make_result(text=json.dumps(payload)))
        result = service.generate_draft(make_request(count=3))
        assert result.saved_count == 0
        assert result.rejected_count == 3
        assert AIQuestionDraft.objects.count() == 0


class TestErrorPropagation:
    def test_request_validation_error_propagates_without_saving(self):
        service = _draft_service(make_result(text=valid_json()))
        with pytest.raises(UnsupportedQuestionTypeError):
            service.generate_draft(make_request(question_type="multi_correct"))
        assert AIQuestionDraft.objects.count() == 0

    def test_provider_failure_propagates_without_saving(self):
        service = _draft_service(make_result(success=False, error="all providers failed"))
        with pytest.raises(ProviderUnavailableError):
            service.generate_draft(make_request())
        assert AIQuestionDraft.objects.count() == 0


class TestDefaultConstruction:
    def test_wires_real_services(self):
        service = QuestionDraftService()
        assert isinstance(service._generation, QuestionGenerationService)
        assert isinstance(service._validation, QuestionValidationService)
