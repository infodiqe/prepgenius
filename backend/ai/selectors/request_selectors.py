"""
AI Gateway selectors — reads only (Sprint-6A-01).

Pure readers over the :class:`ai.models.AIRequest` audit log. No mutations, no
business logic. Used by admin/analytics and future ops tooling; the querysets
are newest-first for cursor pagination.
"""
from __future__ import annotations

from decimal import Decimal

from django.db.models import Count, QuerySet, Sum

from ai.enums import PromptType, Provider, RequestStatus
from ai.models import AIRequest


def get_ai_request(*, request_id) -> AIRequest | None:
    """A single audit row by id, or ``None``."""
    return AIRequest.objects.filter(pk=request_id).first()


def list_ai_requests(
    *,
    user=None,
    provider: str | None = None,
    prompt_type: str | None = None,
    status: str | None = None,
) -> QuerySet[AIRequest]:
    """Filtered audit rows, newest first. All filters are optional."""
    qs = AIRequest.objects.all()
    if user is not None:
        qs = qs.filter(created_by=user)
    if provider is not None:
        qs = qs.filter(provider=Provider(provider).value)
    if prompt_type is not None:
        qs = qs.filter(prompt_type=PromptType(prompt_type).value)
    if status is not None:
        qs = qs.filter(status=RequestStatus(status).value)
    return qs.order_by("-created_at")


def get_ai_request_stats(*, user=None) -> dict:
    """
    Aggregate audit summary for margin/health monitoring:
    ``{total, success, failed, total_tokens, total_cost}``.
    """
    qs = AIRequest.objects.all()
    if user is not None:
        qs = qs.filter(created_by=user)
    agg = qs.aggregate(
        total=Count("id"),
        success=Count("id", filter=_status_filter(RequestStatus.SUCCESS)),
        failed=Count("id", filter=_status_filter(RequestStatus.FAILED)),
        total_tokens=Sum("total_tokens"),
        total_cost=Sum("cost"),
    )
    return {
        "total": agg["total"] or 0,
        "success": agg["success"] or 0,
        "failed": agg["failed"] or 0,
        "total_tokens": agg["total_tokens"] or 0,
        "total_cost": agg["total_cost"] or Decimal("0"),
    }


def _status_filter(status: RequestStatus):
    from django.db.models import Q

    return Q(status=status.value)
