from decimal import Decimal

import pytest

from accounts.tests.factories import UserFactory
from ai.enums import PromptType, Provider, RequestStatus
from ai.exceptions import (
    AllProvidersFailed,
    ProviderError,
    ProviderRateLimitError,
    ProviderResponseError,
    PromptNotRegisteredError,
    PromptRenderError,
)
from ai.models import AIRequest
from ai.providers.base import ProviderResponse
from ai.services import generate
from ai.services.gateway import AIResult

pytestmark = pytest.mark.django_db

HINT_PAYLOAD = {"question": "2+2=?"}


class _StubProvider:
    """Provider double: each ``complete`` call consumes the next scripted item."""

    def __init__(self, *script):
        self.script = list(script)
        self.calls = 0

    def complete(self, **kwargs):
        self.calls += 1
        item = self.script.pop(0)
        if isinstance(item, Exception):
            raise item
        return item


def _patch_build(monkeypatch, mapping):
    def fake_build(name, *, http_client=None):
        return mapping[name]

    monkeypatch.setattr("ai.services.gateway.build_provider", fake_build)


@pytest.fixture(autouse=True)
def _fast_and_deterministic(settings, monkeypatch):
    # Two-provider chain with resolvable models; no real sleeping.
    settings.AI_PROVIDER_CHAIN = ["p1", "p2"]
    settings.AI_DEFAULT_MODELS = {"p1": "m1", "p2": "m2", "mock": "mock-model"}
    settings.AI_MODELS = {}
    settings.AI_MAX_RETRIES = 2
    settings.AI_RETRY_BACKOFF_SECONDS = 0
    settings.AI_TOKEN_PRICING = {}
    monkeypatch.setattr("ai.services.gateway.time.sleep", lambda *_: None)


def _ok(text="answer", pt=3, ct=4):
    return ProviderResponse(text=text, model="m1", prompt_tokens=pt, completion_tokens=ct)


class TestSuccessPath:
    def test_end_to_end_with_real_mock_provider(self, settings):
        settings.AI_PROVIDER_CHAIN = ["mock"]
        user = UserFactory()
        result = generate(
            prompt_type=PromptType.QUESTION_HINT,
            payload=HINT_PAYLOAD,
            created_by=user,
        )
        assert result.success is True
        assert result.provider == Provider.MOCK.value
        assert result.model == "mock-model"
        assert result.text.startswith("[mock:mock-model]")
        assert result.total_tokens > 0
        assert result.request_id is not None

        row = AIRequest.objects.get(id=result.request_id)
        assert row.status == RequestStatus.SUCCESS.value
        assert row.created_by == user
        assert row.prompt_type == PromptType.QUESTION_HINT.value
        assert row.input == HINT_PAYLOAD
        assert row.total_tokens == result.total_tokens
        assert row.attempts == 1

    def test_first_provider_success_short_circuits(self, monkeypatch):
        p1 = _StubProvider(_ok())
        p2 = _StubProvider(_ok())
        _patch_build(monkeypatch, {"p1": p1, "p2": p2})
        result = generate(prompt_type=PromptType.QUESTION_HINT, payload=HINT_PAYLOAD)
        assert result.success is True
        assert result.provider == "p1"
        assert p1.calls == 1
        assert p2.calls == 0

    def test_provider_override_uses_single_provider(self, monkeypatch, settings):
        settings.AI_DEFAULT_MODELS = {"p2": "m2"}
        p2 = _StubProvider(_ok())
        _patch_build(monkeypatch, {"p2": p2})
        result = generate(
            prompt_type=PromptType.QUESTION_HINT, payload=HINT_PAYLOAD, provider="p2"
        )
        assert result.success is True
        assert result.provider == "p2"

    def test_model_override_is_recorded(self, monkeypatch):
        p1 = _StubProvider(_ok())
        _patch_build(monkeypatch, {"p1": p1, "p2": _StubProvider()})
        result = generate(
            prompt_type=PromptType.QUESTION_HINT, payload=HINT_PAYLOAD, model="custom-model"
        )
        assert result.model == "custom-model"

    def test_cost_computed_from_pricing(self, monkeypatch, settings):
        settings.AI_TOKEN_PRICING = {"p1": {"m1": {"prompt": "1", "completion": "2"}}}
        p1 = _StubProvider(_ok(pt=1000, ct=1000))
        _patch_build(monkeypatch, {"p1": p1})
        result = generate(prompt_type=PromptType.QUESTION_HINT, payload=HINT_PAYLOAD)
        assert result.cost == Decimal("3.000000")  # 1.0 + 2.0
        assert AIRequest.objects.get(id=result.request_id).cost == Decimal("3.000000")


class TestRetryAndFallback:
    def test_retries_then_succeeds_same_provider(self, monkeypatch):
        p1 = _StubProvider(ProviderRateLimitError("429"), _ok())
        _patch_build(monkeypatch, {"p1": p1, "p2": _StubProvider()})
        result = generate(prompt_type=PromptType.QUESTION_HINT, payload=HINT_PAYLOAD)
        assert result.success is True
        assert result.provider == "p1"
        assert result.attempts == 2
        assert p1.calls == 2

    def test_falls_back_after_retries_exhausted(self, monkeypatch):
        # p1 fails all attempts (1 + 2 retries = 3), p2 succeeds.
        p1 = _StubProvider(
            ProviderRateLimitError("1"),
            ProviderRateLimitError("2"),
            ProviderRateLimitError("3"),
        )
        p2 = _StubProvider(_ok())
        _patch_build(monkeypatch, {"p1": p1, "p2": p2})
        result = generate(prompt_type=PromptType.QUESTION_HINT, payload=HINT_PAYLOAD)
        assert result.success is True
        assert result.provider == "p2"
        assert p1.calls == 3
        assert p2.calls == 1

    def test_non_retryable_skips_to_next_provider_immediately(self, monkeypatch):
        p1 = _StubProvider(ProviderResponseError("400", retryable=False))
        p2 = _StubProvider(_ok())
        _patch_build(monkeypatch, {"p1": p1, "p2": p2})
        result = generate(prompt_type=PromptType.QUESTION_HINT, payload=HINT_PAYLOAD)
        assert result.success is True
        assert result.provider == "p2"
        assert p1.calls == 1  # no retries on non-retryable

    def test_backoff_sleep_invoked_between_retries(self, monkeypatch, settings):
        settings.AI_RETRY_BACKOFF_SECONDS = 0.5
        sleeps = []
        monkeypatch.setattr("ai.services.gateway.time.sleep", lambda s: sleeps.append(s))
        p1 = _StubProvider(ProviderError("t", retryable=True), _ok())
        _patch_build(monkeypatch, {"p1": p1, "p2": _StubProvider()})
        generate(prompt_type=PromptType.QUESTION_HINT, payload=HINT_PAYLOAD)
        assert sleeps == [0.5]  # one retry → one sleep


class TestFailurePath:
    def test_all_providers_fail_returns_failed_result(self, monkeypatch):
        p1 = _StubProvider(ProviderResponseError("400", retryable=False))
        p2 = _StubProvider(ProviderResponseError("400", retryable=False))
        _patch_build(monkeypatch, {"p1": p1, "p2": p2})
        result = generate(prompt_type=PromptType.QUESTION_HINT, payload=HINT_PAYLOAD)
        assert result.success is False
        assert result.text == ""
        assert result.error
        row = AIRequest.objects.get(id=result.request_id)
        assert row.status == RequestStatus.FAILED.value
        assert row.error

    def test_raise_on_failure_raises(self, monkeypatch):
        p1 = _StubProvider(ProviderResponseError("400", retryable=False))
        p2 = _StubProvider(ProviderResponseError("400", retryable=False))
        _patch_build(monkeypatch, {"p1": p1, "p2": p2})
        with pytest.raises(AllProvidersFailed):
            generate(
                prompt_type=PromptType.QUESTION_HINT,
                payload=HINT_PAYLOAD,
                raise_on_failure=True,
            )
        # Failure still audited even when raising.
        assert AIRequest.objects.filter(status=RequestStatus.FAILED.value).count() == 1

    def test_unresolvable_model_skips_provider(self, monkeypatch, settings):
        # p1 has no model configured → skipped; p2 handles it.
        settings.AI_DEFAULT_MODELS = {"p2": "m2"}
        p2 = _StubProvider(_ok())
        _patch_build(monkeypatch, {"p2": p2})
        result = generate(prompt_type=PromptType.QUESTION_HINT, payload=HINT_PAYLOAD)
        assert result.success is True
        assert result.provider == "p2"

    def test_build_provider_config_error_skips(self, monkeypatch, settings):
        from ai.exceptions import ProviderConfigurationError

        def fake_build(name, *, http_client=None):
            if name == "p1":
                raise ProviderConfigurationError("no key")
            return _StubProvider(_ok())

        monkeypatch.setattr("ai.services.gateway.build_provider", fake_build)
        result = generate(prompt_type=PromptType.QUESTION_HINT, payload=HINT_PAYLOAD)
        assert result.success is True
        assert result.provider == "p2"


class TestContractErrors:
    def test_unknown_prompt_type_raises(self):
        with pytest.raises(PromptNotRegisteredError):
            generate(prompt_type="does_not_exist", payload={})
        assert AIRequest.objects.count() == 0

    def test_missing_required_input_raises(self):
        with pytest.raises(PromptRenderError):
            generate(prompt_type=PromptType.QUESTION_HINT, payload={})
        assert AIRequest.objects.count() == 0


class TestAuditResilience:
    def test_audit_write_failure_does_not_crash_caller(self, monkeypatch):
        p1 = _StubProvider(_ok())
        _patch_build(monkeypatch, {"p1": p1})

        def boom(*a, **k):
            raise RuntimeError("db down")

        monkeypatch.setattr("ai.models.AIRequest.objects.create", boom)
        result = generate(prompt_type=PromptType.QUESTION_HINT, payload=HINT_PAYLOAD)
        assert result.success is True
        assert result.request_id is None  # audit failed but call succeeded


class TestAIResultShape:
    def test_result_is_dataclass_with_expected_fields(self, monkeypatch):
        _patch_build(monkeypatch, {"p1": _StubProvider(_ok())})
        result = generate(prompt_type=PromptType.QUESTION_HINT, payload=HINT_PAYLOAD)
        assert isinstance(result, AIResult)
        assert result.prompt_type == PromptType.QUESTION_HINT.value
        assert result.latency_ms >= 0
