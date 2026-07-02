import pytest

from ai.generation.draft_dto import DraftGenerationResult, draft_to_dto
from ai.tests.factories import AIQuestionDraftFactory
from ai.tests.validation_utils import good_question
from ai.validation import QuestionValidationService

pytestmark = pytest.mark.django_db


class TestDraftToDto:
    def test_maps_model_to_dto(self):
        draft = AIQuestionDraftFactory(exam="CTET", confidence=0.8)
        dto = draft_to_dto(draft)
        assert dto.id == str(draft.id)
        assert dto.exam == "CTET"
        assert dto.confidence == 0.8
        assert dto.status == "generated"
        assert dto.created_at  # isoformat string
        d = dto.to_dict()
        assert d["id"] == str(draft.id)
        assert d["options"] == draft.options


class TestDraftGenerationResult:
    def test_counts_and_to_dict(self):
        draft = AIQuestionDraftFactory()
        dto = draft_to_dto(draft)
        rejected = QuestionValidationService().validate(good_question(stem=""))
        result = DraftGenerationResult(
            drafts=[dto], rejected=[rejected], provider="mock", model="m", request_id="r"
        )
        assert result.saved_count == 1
        assert result.rejected_count == 1
        assert result.generated_count == 2
        assert result.counts == {"generated": 2, "saved": 1, "rejected": 1}
        d = result.to_dict()
        assert d["counts"]["saved"] == 1
        assert len(d["drafts"]) == 1
        assert d["rejected"][0]["valid"] is False
