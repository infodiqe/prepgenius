"""
Provider-health selectors — reads only (Sprint-6B-01, Task 3).

Pure readers over :class:`ai.models.ProviderHealth`. No mutations, no business
logic. Used by the admin monitoring views and future ops tooling.
"""
from __future__ import annotations

from django.db.models import QuerySet

from ai.models import ProviderHealth


def get_provider_health(*, provider: str) -> ProviderHealth | None:
    """One provider's health row, or ``None`` if it has never been called."""
    return ProviderHealth.objects.filter(provider=provider).first()


def list_provider_health() -> QuerySet[ProviderHealth]:
    """All provider health rows, ordered by provider name."""
    return ProviderHealth.objects.all().order_by("provider")


def get_provider_health_summary() -> list[dict]:
    """
    A compact per-provider health summary for monitoring:
    ``[{provider, circuit_state, success_rate, success, failure, timeout, retry,
    last_success_at, last_failure_at}, ...]``.
    """
    return [
        {
            "provider": row.provider,
            "circuit_state": row.circuit_state,
            "success_rate": row.success_rate,
            "success": row.success_count,
            "failure": row.failure_count,
            "timeout": row.timeout_count,
            "retry": row.retry_count,
            "last_success_at": row.last_success_at,
            "last_failure_at": row.last_failure_at,
        }
        for row in list_provider_health()
    ]
