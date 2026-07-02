from decimal import Decimal

import pytest

from accounts.tests.factories import UserFactory
from ai.enums import PromptType, Provider, RequestStatus
from ai.selectors import get_ai_request, get_ai_request_stats, list_ai_requests
from ai.tests.factories import AIRequestFactory

pytestmark = pytest.mark.django_db


class TestGetAiRequest:
    def test_returns_row(self):
        req = AIRequestFactory()
        assert get_ai_request(request_id=req.id) == req

    def test_missing_returns_none(self):
        import uuid

        assert get_ai_request(request_id=uuid.uuid4()) is None


class TestListAiRequests:
    def test_filters_by_provider(self):
        AIRequestFactory(provider=Provider.GROQ.value)
        AIRequestFactory(provider=Provider.OPENAI.value)
        rows = list_ai_requests(provider=Provider.GROQ.value)
        assert rows.count() == 1
        assert rows.first().provider == Provider.GROQ.value

    def test_filters_by_prompt_type_and_status(self):
        AIRequestFactory(
            prompt_type=PromptType.QUESTION_HINT.value,
            status=RequestStatus.SUCCESS.value,
        )
        AIRequestFactory(
            prompt_type=PromptType.QUESTION_HINT.value,
            status=RequestStatus.FAILED.value,
        )
        assert list_ai_requests(prompt_type=PromptType.QUESTION_HINT.value).count() == 2
        assert list_ai_requests(status=RequestStatus.FAILED.value).count() == 1

    def test_filters_by_user(self):
        user = UserFactory()
        AIRequestFactory(created_by=user)
        AIRequestFactory(created_by=None)
        assert list_ai_requests(user=user).count() == 1

    def test_no_filters_returns_all_newest_first(self):
        a = AIRequestFactory()
        b = AIRequestFactory()
        rows = list(list_ai_requests())
        assert rows == [b, a]


class TestStats:
    def test_empty_stats(self):
        stats = get_ai_request_stats()
        assert stats == {
            "total": 0,
            "success": 0,
            "failed": 0,
            "total_tokens": 0,
            "total_cost": Decimal("0"),
        }

    def test_aggregates(self):
        AIRequestFactory(
            status=RequestStatus.SUCCESS.value, total_tokens=10, cost=Decimal("0.10")
        )
        AIRequestFactory(
            status=RequestStatus.SUCCESS.value, total_tokens=5, cost=Decimal("0.05")
        )
        AIRequestFactory(
            status=RequestStatus.FAILED.value, total_tokens=0, cost=Decimal("0")
        )
        stats = get_ai_request_stats()
        assert stats["total"] == 3
        assert stats["success"] == 2
        assert stats["failed"] == 1
        assert stats["total_tokens"] == 15
        assert stats["total_cost"] == Decimal("0.15")

    def test_scoped_by_user(self):
        user = UserFactory()
        AIRequestFactory(created_by=user, total_tokens=7)
        AIRequestFactory(created_by=None, total_tokens=99)
        stats = get_ai_request_stats(user=user)
        assert stats["total"] == 1
        assert stats["total_tokens"] == 7
