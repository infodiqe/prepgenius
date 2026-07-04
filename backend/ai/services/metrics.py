"""
Provider health metrics recording (Sprint-6B-01, Task 3 + Task 5).

The gateway calls :func:`record_success` / :func:`record_failure` after every
provider attempt-block. Each updates the provider's :class:`ai.models.ProviderHealth`
row under a row lock (``select_for_update``) inside an atomic transaction so
concurrent workers cannot lose an increment, and drives the circuit breaker:

* success  → counters += , close the circuit, reset consecutive failures.
* failure  → counters += , increment consecutive failures, and open the circuit
  once the configured failure threshold is reached.

Recording is best-effort: it must never break the AI call. The gateway wraps
these in its own guard, but they are also written defensively.
"""
from __future__ import annotations

import logging

from django.db import transaction
from django.utils import timezone

from ai.services import config

logger = logging.getLogger("ai.metrics")


def _locked_row(provider: str):
    """Get-or-create the provider row, then re-fetch it under a row lock."""
    from ai.models import ProviderHealth

    ProviderHealth.objects.get_or_create(provider=provider)
    return ProviderHealth.objects.select_for_update().get(provider=provider)


def record_success(provider: str, *, retries: int = 0) -> None:
    """Record a successful provider call and close/heal the circuit."""
    from ai.models import CircuitState

    with transaction.atomic():
        row = _locked_row(provider)
        row.success_count += 1
        row.retry_count += max(0, retries)
        row.last_success_at = timezone.now()
        # Any success heals the breaker (covers both closed and half_open probes).
        row.circuit_state = CircuitState.CLOSED
        row.consecutive_failures = 0
        row.opened_at = None
        row.save(
            update_fields=[
                "success_count",
                "retry_count",
                "last_success_at",
                "circuit_state",
                "consecutive_failures",
                "opened_at",
                "updated_at",
            ]
        )


def record_failure(provider: str, *, timeout: bool = False, retries: int = 0) -> None:
    """Record a failed provider call; trip the circuit at the failure threshold."""
    from ai.models import CircuitState

    cfg = config.circuit_config()
    with transaction.atomic():
        row = _locked_row(provider)
        row.failure_count += 1
        if timeout:
            row.timeout_count += 1
        row.retry_count += max(0, retries)
        row.last_failure_at = timezone.now()
        row.consecutive_failures += 1
        # A half-open probe that fails, or crossing the threshold, opens the circuit.
        if (
            row.circuit_state == CircuitState.HALF_OPEN
            or row.consecutive_failures >= cfg.failure_threshold
        ):
            row.circuit_state = CircuitState.OPEN
            row.opened_at = timezone.now()
        row.save(
            update_fields=[
                "failure_count",
                "timeout_count",
                "retry_count",
                "last_failure_at",
                "consecutive_failures",
                "circuit_state",
                "opened_at",
                "updated_at",
            ]
        )
