"""
Provider-health + cost-breakdown selector tests (Sprint-6B-01, Tasks 3 & 4).
"""
from decimal import Decimal

import pytest

from accounts.tests.factories import UserFactory
from ai.enums import RequestStatus
from ai.models import AIRequest, CircuitState, ProviderHealth
from ai.selectors import (
    get_ai_cost_breakdown,
    get_provider_health,
    get_provider_health_summary,
    list_provider_health,
)

pytestmark = pytest.mark.django_db


class TestHealthSelectors:
    def test_get_and_list(self):
        ProviderHealth.objects.create(provider="groq", success_count=3, failure_count=1)
        ProviderHealth.objects.create(provider="openai", success_count=1)
        assert get_provider_health(provider="groq").success_count == 3
        assert get_provider_health(provider="missing") is None
        assert [r.provider for r in list_provider_health()] == ["groq", "openai"]

    def test_summary_shape_and_rate(self):
        ProviderHealth.objects.create(
            provider="groq",
            success_count=3,
            failure_count=1,
            timeout_count=1,
            retry_count=2,
            circuit_state=CircuitState.CLOSED,
        )
        summary = get_provider_health_summary()
        assert summary[0]["provider"] == "groq"
        assert summary[0]["success_rate"] == pytest.approx(0.75)
        assert summary[0]["timeout"] == 1
        assert summary[0]["circuit_state"] == "closed"


class TestCostBreakdown:
    def test_groups_by_provider_model_with_decimal_cost(self):
        user = UserFactory()
        for _ in range(2):
            AIRequest.objects.create(
                provider="groq", model="llama", prompt_type="question_generation",
                status=RequestStatus.SUCCESS, prompt_tokens=100, completion_tokens=50,
                total_tokens=150, cost=Decimal("0.001500"), created_by=user,
            )
        AIRequest.objects.create(
            provider="openai", model="gpt", prompt_type="question_generation",
            status=RequestStatus.SUCCESS, prompt_tokens=10, completion_tokens=5,
            total_tokens=15, cost=Decimal("0.000100"),
        )
        rows = get_ai_cost_breakdown()
        # Highest total cost first: groq (2 × 0.0015 = 0.003) before openai (0.0001).
        assert rows[0]["provider"] == "groq"
        assert rows[0]["calls"] == 2
        assert rows[0]["total_tokens"] == 300
        assert rows[0]["total_cost"] == Decimal("0.003000")
        assert isinstance(rows[0]["total_cost"], Decimal)

    def test_scoped_by_user(self):
        user = UserFactory()
        AIRequest.objects.create(
            provider="groq", model="llama", prompt_type="question_generation",
            status=RequestStatus.SUCCESS, cost=Decimal("0.01"), created_by=user,
        )
        AIRequest.objects.create(
            provider="groq", model="llama", prompt_type="question_generation",
            status=RequestStatus.SUCCESS, cost=Decimal("0.99"),
        )
        rows = get_ai_cost_breakdown(user=user)
        assert len(rows) == 1
        assert rows[0]["total_cost"] == Decimal("0.010000")
