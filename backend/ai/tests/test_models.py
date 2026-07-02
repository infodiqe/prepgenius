from decimal import Decimal

import pytest

from ai.enums import PromptType, Provider, RequestStatus
from ai.models import AIRequest
from ai.tests.factories import AIRequestFactory

pytestmark = pytest.mark.django_db


class TestAIRequestModel:
    def test_defaults(self):
        req = AIRequest.objects.create(
            provider=Provider.MOCK.value,
            model="mock-model",
            prompt_type=PromptType.QUESTION_HINT.value,
        )
        assert req.status == RequestStatus.PENDING.value
        assert req.input == {}
        assert req.output == ""
        assert req.cost == Decimal("0")
        assert req.attempts == 1
        assert req.created_at is not None

    def test_str(self):
        req = AIRequestFactory(
            provider=Provider.GROQ.value,
            model="llama",
            prompt_type=PromptType.QUESTION_GENERATION.value,
            status=RequestStatus.SUCCESS.value,
        )
        text = str(req)
        assert "question_generation" in text
        assert "groq/llama" in text
        assert "success" in text

    def test_cost_precision_is_preserved(self):
        req = AIRequestFactory(cost=Decimal("0.001234"))
        req.refresh_from_db()
        assert req.cost == Decimal("0.001234")

    def test_ordering_newest_first(self):
        a = AIRequestFactory()
        b = AIRequestFactory()
        rows = list(AIRequest.objects.all())
        assert rows[0] == b
        assert rows[1] == a
