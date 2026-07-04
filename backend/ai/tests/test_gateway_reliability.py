"""
Gateway ↔ health/circuit integration tests (Sprint-6B-01, Tasks 3 & 5).

Verifies the gateway records provider health on every attempt-block and honours
the circuit breaker (skips an open provider, falls back to the next). Providers
are stubbed — no live AI call.
"""
import pytest
from django.utils import timezone

from ai.enums import PromptType
from ai.exceptions import ProviderResponseError, ProviderTimeoutError
from ai.models import CircuitState, ProviderHealth
from ai.providers.base import ProviderResponse
from ai.services import generate

pytestmark = pytest.mark.django_db

HINT = PromptType.QUESTION_HINT
PAYLOAD = {"question": "2+2=?"}


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


def _ok():
    return ProviderResponse(text="ok", model="m1", prompt_tokens=1, completion_tokens=1)


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
    settings.AI_MAX_RETRIES = 2
    settings.AI_RETRY_BACKOFF_SECONDS = 0
    settings.AI_CIRCUIT_BREAKER_ENABLED = True
    settings.AI_CIRCUIT_FAILURE_THRESHOLD = 3
    settings.AI_CIRCUIT_COOLDOWN_SECONDS = 60.0
    settings.AI_CREDIT_COSTS = {}
    monkeypatch.setattr("ai.services.gateway.time.sleep", lambda *_: None)


class TestHealthRecording:
    def test_success_records_health(self, monkeypatch):
        _patch_build(monkeypatch, {"p1": _StubProvider(_ok())})
        generate(prompt_type=HINT, payload=PAYLOAD)
        row = ProviderHealth.objects.get(provider="p1")
        assert row.success_count == 1
        assert row.circuit_state == CircuitState.CLOSED

    def test_failure_records_health_with_retries(self, monkeypatch):
        # p1 fails all 3 attempts (retryable) → recorded as one failure + 2 retries.
        p1 = _StubProvider(
            ProviderResponseError("500", retryable=True),
            ProviderResponseError("500", retryable=True),
            ProviderResponseError("500", retryable=True),
        )
        _patch_build(monkeypatch, {"p1": p1, "p2": _StubProvider(_ok())})
        generate(prompt_type=HINT, payload=PAYLOAD)
        p1_row = ProviderHealth.objects.get(provider="p1")
        assert p1_row.failure_count == 1
        assert p1_row.retry_count == 2
        assert ProviderHealth.objects.get(provider="p2").success_count == 1

    def test_timeout_increments_timeout_count(self, monkeypatch, settings):
        settings.AI_MAX_RETRIES = 0  # single attempt → one timeout failure
        p1 = _StubProvider(ProviderTimeoutError("slow", provider="p1"))
        _patch_build(monkeypatch, {"p1": p1, "p2": _StubProvider(_ok())})
        generate(prompt_type=HINT, payload=PAYLOAD)
        assert ProviderHealth.objects.get(provider="p1").timeout_count == 1


class TestCircuitSkip:
    def test_gateway_skips_open_provider_and_falls_back(self, monkeypatch):
        # p1's circuit is already OPEN and within cooldown → gateway must skip it.
        ProviderHealth.objects.create(
            provider="p1",
            circuit_state=CircuitState.OPEN,
            consecutive_failures=3,
            opened_at=timezone.now(),
        )
        p1 = _StubProvider(_ok())
        p2 = _StubProvider(_ok())
        _patch_build(monkeypatch, {"p1": p1, "p2": p2})

        result = generate(prompt_type=HINT, payload=PAYLOAD)

        assert result.success is True
        assert result.provider == "p2"
        assert p1.calls == 0  # skipped entirely
        assert p2.calls == 1


class TestMetricsResilience:
    def test_health_write_failure_does_not_break_call(self, monkeypatch):
        _patch_build(monkeypatch, {"p1": _StubProvider(_ok())})

        def boom(*a, **k):
            raise RuntimeError("health db down")

        monkeypatch.setattr("ai.services.metrics.record_success", boom)
        # Monitoring is best-effort: the AI call still succeeds.
        result = generate(prompt_type=HINT, payload=PAYLOAD)
        assert result.success is True

    def test_failure_health_write_error_does_not_break_call(self, monkeypatch, settings):
        settings.AI_MAX_RETRIES = 0
        p1 = _StubProvider(ProviderResponseError("500", retryable=True))
        _patch_build(monkeypatch, {"p1": p1, "p2": _StubProvider(_ok())})

        def boom(*a, **k):
            raise RuntimeError("health db down")

        monkeypatch.setattr("ai.services.metrics.record_failure", boom)
        # p1's failure-metric write blows up but the gateway still falls back to p2.
        result = generate(prompt_type=HINT, payload=PAYLOAD)
        assert result.success is True
        assert result.provider == "p2"
