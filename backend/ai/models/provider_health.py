"""
ProviderHealth — per-provider reliability metrics + circuit state (Sprint-6B-01).

One row per AI provider, maintained by the gateway on every call. It serves two
jobs that deliberately share a row so there is a single source of truth:

* **Monitoring (Task 3):** success/failure/timeout/retry counters and the last
  success/failure timestamps, read-only in the admin.
* **Circuit protection (Task 5):** a lightweight breaker (``closed → open →
  half_open``) that lets the gateway skip a provider that is failing repeatedly
  and recover it automatically after a cooldown. All thresholds/timeouts are
  configuration (``AI_CIRCUIT_*`` settings) — nothing is hardcoded.

Rows are written exclusively by ``ai.services.metrics`` / ``ai.services.circuit``
under a row lock; never mutated directly elsewhere.
"""
from __future__ import annotations

import uuid

from django.db import models


class CircuitState(models.TextChoices):
    CLOSED = "closed", "Closed"      # healthy — requests flow normally
    OPEN = "open", "Open"            # tripped — requests skipped until cooldown
    HALF_OPEN = "half_open", "Half-open"  # probing — one trial request allowed


class ProviderHealth(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.CharField(max_length=20, unique=True)

    # ── Reliability counters (monotonic) ─────────────────────────────────────
    success_count = models.PositiveIntegerField(default=0)
    failure_count = models.PositiveIntegerField(default=0)
    timeout_count = models.PositiveIntegerField(default=0)
    retry_count = models.PositiveIntegerField(default=0)

    last_success_at = models.DateTimeField(null=True, blank=True)
    last_failure_at = models.DateTimeField(null=True, blank=True)

    # ── Circuit breaker state ────────────────────────────────────────────────
    circuit_state = models.CharField(
        max_length=10, choices=CircuitState.choices, default=CircuitState.CLOSED
    )
    consecutive_failures = models.PositiveIntegerField(default=0)
    opened_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ai_provider_health"
        verbose_name = "AI Provider Health"
        verbose_name_plural = "AI Provider Health"
        ordering = ["provider"]
        indexes = [
            models.Index(fields=["circuit_state"], name="ix_ai_health_circuit"),
        ]

    @property
    def total_calls(self) -> int:
        return self.success_count + self.failure_count

    @property
    def success_rate(self) -> float:
        """Fraction of terminal calls that succeeded (0.0–1.0); 0.0 when no calls."""
        total = self.total_calls
        return (self.success_count / total) if total else 0.0

    def __str__(self) -> str:
        return f"ProviderHealth({self.provider}, {self.circuit_state}, {self.success_rate:.0%})"
