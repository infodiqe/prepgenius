"""
Gateway credit-protocol tests (Sprint-6B-01, Task 2).

The gateway reserves credits before a provider call and commits on success /
releases on failure, reusing the credits module (never duplicating ledger logic).
These exercise the real gateway with stubbed providers so no live AI call occurs.
"""
from decimal import Decimal

import pytest

from accounts.tests.factories import UserFactory
from ai.enums import PromptType
from ai.exceptions import InsufficientCreditsError
from ai.providers.base import ProviderResponse
from ai.services import generate
from credits.models import CreditLedger
from credits.selectors import get_credit_balance
from credits.services import grant_credits

pytestmark = pytest.mark.django_db

GEN = PromptType.QUESTION_GENERATION
GEN_PAYLOAD = {"exam": "CTET", "subject": "Math", "topic": "Fractions"}


class _StubProvider:
    def __init__(self, *script):
        self.script = list(script)
        self.calls = 0

    def complete(self, **kwargs):
        self.calls += 1
        item = self.script.pop(0)
        if isinstance(item, Exception):
            raise item
        return item


def _ok(text="ok"):
    return ProviderResponse(text=text, model="m1", prompt_tokens=3, completion_tokens=4)


def _patch_build(monkeypatch, mapping):
    monkeypatch.setattr(
        "ai.services.gateway.build_provider",
        lambda name, *, http_client=None: mapping[name],
    )


@pytest.fixture(autouse=True)
def _cfg(settings, monkeypatch):
    settings.AI_PROVIDER_CHAIN = ["p1", "p2"]
    settings.AI_DEFAULT_MODELS = {"p1": "m1", "p2": "m2"}
    settings.AI_MODELS = {}
    settings.AI_MAX_RETRIES = 0
    settings.AI_TOKEN_PRICING = {}
    settings.AI_CREDIT_COSTS = {"question_generation": "2"}  # 2 credits / question
    monkeypatch.setattr("ai.services.gateway.time.sleep", lambda *_: None)


def _bal(user):
    return get_credit_balance(user=user)


class TestReserveCommitOnSuccess:
    def test_success_commits_reserved_credits(self, monkeypatch):
        user = UserFactory()
        grant_credits(user=user, amount=Decimal("10"))
        _patch_build(monkeypatch, {"p1": _StubProvider(_ok())})

        result = generate(
            prompt_type=GEN, payload=GEN_PAYLOAD, created_by=user, credit_units=3
        )

        assert result.success is True
        bal = _bal(user)
        # cost = 2 * 3 = 6 committed (spent); available 10 - 6 = 4; nothing reserved.
        assert bal.available_credits == Decimal("4.00")
        assert bal.reserved_credits == Decimal("0.00")
        types = list(
            CreditLedger.objects.filter(user=user).values_list("transaction_type", flat=True)
        )
        assert "reservation" in types and "debit" in types
        # Ledger entries correlate with the AIRequest id.
        debit = CreditLedger.objects.get(user=user, transaction_type="debit")
        assert str(debit.reference_id) == result.request_id


class TestReleaseOnFailure:
    def test_all_providers_fail_releases_reservation(self, monkeypatch):
        from ai.exceptions import ProviderResponseError

        user = UserFactory()
        grant_credits(user=user, amount=Decimal("10"))
        _patch_build(
            monkeypatch,
            {
                "p1": _StubProvider(ProviderResponseError("400", retryable=False)),
                "p2": _StubProvider(ProviderResponseError("400", retryable=False)),
            },
        )

        result = generate(
            prompt_type=GEN, payload=GEN_PAYLOAD, created_by=user, credit_units=3
        )

        assert result.success is False
        bal = _bal(user)
        # Reservation fully released → back to the starting position, nothing spent.
        assert bal.available_credits == Decimal("10.00")
        assert bal.reserved_credits == Decimal("0.00")
        assert CreditLedger.objects.filter(user=user, transaction_type="release").exists()


class TestInsufficientCredits:
    def test_insufficient_raises_and_calls_no_provider(self, monkeypatch):
        user = UserFactory()
        grant_credits(user=user, amount=Decimal("1"))  # < cost (2 * 1)
        p1 = _StubProvider(_ok())
        _patch_build(monkeypatch, {"p1": p1})

        with pytest.raises(InsufficientCreditsError):
            generate(prompt_type=GEN, payload=GEN_PAYLOAD, created_by=user, credit_units=1)

        assert p1.calls == 0  # no call without a successful reserve
        bal = _bal(user)
        assert bal.available_credits == Decimal("1.00")
        assert bal.reserved_credits == Decimal("0.00")


class TestNoChargeCases:
    def test_zero_cost_prompt_type_does_not_touch_credits(self, monkeypatch):
        user = UserFactory()
        grant_credits(user=user, amount=Decimal("10"))
        _patch_build(monkeypatch, {"p1": _StubProvider(_ok())})

        # Hint has no configured cost → free; no reservation/commit.
        result = generate(
            prompt_type=PromptType.QUESTION_HINT,
            payload={"question": "2+2?"},
            created_by=user,
        )
        assert result.success is True
        assert _bal(user).available_credits == Decimal("10.00")
        assert not CreditLedger.objects.filter(
            user=user, transaction_type__in=["reservation", "debit"]
        ).exists()

    def test_system_call_without_user_is_not_charged(self, monkeypatch):
        _patch_build(monkeypatch, {"p1": _StubProvider(_ok())})
        result = generate(prompt_type=GEN, payload=GEN_PAYLOAD, created_by=None, credit_units=5)
        assert result.success is True
        assert CreditLedger.objects.count() == 0
