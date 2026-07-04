"""
Provider circuit breaker (Sprint-6B-01, Task 5).

A lightweight, configuration-driven breaker layered on the shared
:class:`ai.models.ProviderHealth` row. The gateway asks :func:`allow_request`
before trying a provider:

* **closed**   → allow (healthy).
* **open**     → skip until ``cooldown_seconds`` have elapsed since ``opened_at``;
  once elapsed, transition to **half_open** and allow a single probe.
* **half_open**→ allow (the probe). The probe's outcome is recorded by
  ``ai.services.metrics``: success closes the circuit, failure re-opens it.

Thresholds and cooldown come entirely from ``AI_CIRCUIT_*`` settings (Task 6);
nothing is hardcoded. When the breaker is disabled by config, every provider is
always allowed (metrics are still recorded for monitoring).
"""
from __future__ import annotations

import logging

from django.db import transaction
from django.utils import timezone

from ai.services import config

logger = logging.getLogger("ai.circuit")


def allow_request(provider: str) -> bool:
    """Return whether the gateway may call ``provider`` right now."""
    # Imported lazily to avoid a models import at module load (circular-safe).
    from ai.models import CircuitState, ProviderHealth

    cfg = config.circuit_config()
    if not cfg.enabled:
        return True

    row = ProviderHealth.objects.filter(provider=provider).first()
    if row is None or row.circuit_state == CircuitState.CLOSED:
        return True

    if row.circuit_state == CircuitState.HALF_OPEN:
        # A probe is already permitted; allow (keeps the breaker lightweight).
        return True

    # OPEN: skip until the cooldown elapses, then allow one half-open probe.
    if row.opened_at is None:
        return True
    elapsed = (timezone.now() - row.opened_at).total_seconds()
    if elapsed < cfg.cooldown_seconds:
        logger.info(
            "ai.circuit.skip", extra={"provider": provider, "elapsed": elapsed}
        )
        return False

    # Cooldown elapsed → move to half-open (atomically) and allow the probe.
    with transaction.atomic():
        locked = ProviderHealth.objects.select_for_update().get(pk=row.pk)
        if locked.circuit_state == CircuitState.OPEN:
            locked.circuit_state = CircuitState.HALF_OPEN
            locked.save(update_fields=["circuit_state", "updated_at"])
    logger.info("ai.circuit.half_open", extra={"provider": provider})
    return True
