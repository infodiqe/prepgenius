import pytest

from ai.models import AIQuestionDraft, DraftStatus
from ai.tests.factories import AIQuestionDraftFactory

pytestmark = pytest.mark.django_db


class TestAIQuestionDraftModel:
    def test_status_enum_values(self):
        assert DraftStatus.values == ["generated", "imported", "discarded"]

    def test_defaults(self):
        draft = AIQuestionDraft.objects.create(
            exam="CTET", subject="Maths", topic="Fractions",
            question_type="single_correct", difficulty="medium",
            bloom_level="apply", language="en", stem="Q",
        )
        assert draft.status == DraftStatus.GENERATED
        assert draft.imported_question is None
        assert draft.imported_at is None
        assert draft.options == []
        assert draft.tags == []
        assert draft.validation_report == {}
        assert draft.confidence is None
        assert draft.created_at is not None
        assert draft.updated_at is not None

    def test_str(self):
        draft = AIQuestionDraftFactory(exam="SSC")
        assert "SSC" in str(draft)
        assert "generated" in str(draft)

    def test_ordering_newest_first(self):
        a = AIQuestionDraftFactory()
        b = AIQuestionDraftFactory()
        assert list(AIQuestionDraft.objects.all())[0] == b
