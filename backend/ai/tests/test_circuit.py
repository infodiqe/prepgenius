"""
Circuit breaker + health metrics tests (Sprint-6B-01, Tasks 3 & 5).

Covers the closed → open → half_open → closed lifecycle, the failure threshold,
the cooldown, automatic recovery, and the counters/timestamps that back the
monitoring admin. Config-driven throughout (no hardcoded thresholds).
"""
from datetime import timedelta

import pytest
from django.utils import timezone

from ai.models import CircuitState, ProviderHealth
from ai.services import circuit, metrics

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _cfg(settings):
    settings.AI_CIRCUIT_BREAKER_ENABLED = True
    settings.AI_CIRCUIT_FAILURE_THRESHOLD = 3
    settings.AI_CIRCUIT_COOLDOWN_SECONDS = 60.0


def _row(provider="p1"):
    return ProviderHealth.objects.get(provider=provider)


class TestMetricsRecording:
    def test_success_increments_and_closes(self):
        metrics.record_success("p1", retries=2)
        row = _row()
        assert row.success_count == 1
        assert row.retry_count == 2
        assert row.circuit_state == CircuitState.CLOSED
        assert row.last_success_at is not None

    def test_failure_increments_counters(self):
        metrics.record_failure("p1", timeout=True, retries=1)
        row = _row()
        assert row.failure_count == 1
        assert row.timeout_count == 1
        assert row.retry_count == 1
        assert row.consecutive_failures == 1
        assert row.last_failure_at is not None

    def test_success_rate(self):
        metrics.record_success("p1")
        metrics.record_success("p1")
        metrics.record_failure("p1")
        assert _row().success_rate == pytest.approx(2 / 3)


class TestCircuitOpens:
    def test_opens_at_threshold(self):
        for _ in range(3):  # threshold = 3
            metrics.record_failure("p1")
        row = _row()
        assert row.circuit_state == CircuitState.OPEN
        assert row.opened_at is not None

    def test_stays_closed_below_threshold(self):
        metrics.record_failure("p1")
        metrics.record_failure("p1")
        assert _row().circuit_state == CircuitState.CLOSED

    def test_open_circuit_blocks_requests(self):
        for _ in range(3):
            metrics.record_failure("p1")
        assert circuit.allow_request("p1") is False

    def test_success_resets_consecutive_failures(self):
        metrics.record_failure("p1")
        metrics.record_failure("p1")
        metrics.record_success("p1")
        row = _row()
        assert row.consecutive_failures == 0
        assert row.circuit_state == CircuitState.CLOSED


class TestCircuitRecovery:
    def test_cooldown_elapsed_moves_to_half_open_and_allows_probe(self):
        for _ in range(3):
            metrics.record_failure("p1")
        # Backdate opened_at beyond the cooldown window.
        ProviderHealth.objects.filter(provider="p1").update(
            opened_at=timezone.now() - timedelta(seconds=120)
        )
        assert circuit.allow_request("p1") is True
        assert _row().circuit_state == CircuitState.HALF_OPEN

    def test_half_open_allows_probe_request(self):
        ProviderHealth.objects.create(
            provider="p1", circuit_state=CircuitState.HALF_OPEN, consecutive_failures=3
        )
        assert circuit.allow_request("p1") is True

    def test_half_open_success_closes_circuit(self):
        ProviderHealth.objects.create(
            provider="p1", circuit_state=CircuitState.HALF_OPEN, consecutive_failures=3
        )
        metrics.record_success("p1")
        assert _row().circuit_state == CircuitState.CLOSED

    def test_half_open_failure_reopens_immediately(self):
        ProviderHealth.objects.create(
            provider="p1", circuit_state=CircuitState.HALF_OPEN, consecutive_failures=1
        )
        metrics.record_failure("p1")  # single failure while half-open → reopen
        assert _row().circuit_state == CircuitState.OPEN


class TestConfigDriven:
    def test_unknown_provider_is_allowed(self):
        assert circuit.allow_request("never-seen") is True

    def test_disabled_breaker_always_allows(self, settings):
        settings.AI_CIRCUIT_BREAKER_ENABLED = False
        for _ in range(10):
            metrics.record_failure("p1")
        # Row still records OPEN for monitoring, but the breaker is bypassed.
        assert circuit.allow_request("p1") is True

    def test_open_without_opened_at_is_allowed(self):
        # Defensive: an OPEN row missing opened_at cannot compute a cooldown, so
        # the breaker fails open (allows) rather than skipping the provider forever.
        ProviderHealth.objects.create(
            provider="p1", circuit_state=CircuitState.OPEN, opened_at=None
        )
        assert circuit.allow_request("p1") is True
