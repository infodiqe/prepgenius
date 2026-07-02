"""
AI question-draft selectors — reads only (Sprint-6A-04, extended 6A-07).

Pure readers over :class:`ai.models.AIQuestionDraft`. No mutations, no business
logic. The list reader adds provider filtering, free-text search, and a
whitelisted ordering for the operator draft-management workspace.
"""
from __future__ import annotations

from django.db.models import Q, QuerySet

from ai.models import AIQuestionDraft

# Whitelisted sort columns (prevents arbitrary-field ordering injection).
_ORDERABLE_FIELDS = frozenset(
    {"created_at", "difficulty", "exam", "subject", "status", "provider", "language"}
)
_DEFAULT_ORDERING = "-created_at"


def get_ai_draft(*, draft_id) -> AIQuestionDraft | None:
    return AIQuestionDraft.objects.filter(pk=draft_id).first()


def _resolve_ordering(ordering: str | None) -> str:
    if not ordering:
        return _DEFAULT_ORDERING
    base = ordering[1:] if ordering.startswith("-") else ordering
    return ordering if base in _ORDERABLE_FIELDS else _DEFAULT_ORDERING


def list_ai_drafts(
    *,
    created_by=None,
    status: str | None = None,
    exam: str | None = None,
    subject: str | None = None,
    topic: str | None = None,
    difficulty: str | None = None,
    language: str | None = None,
    provider: str | None = None,
    search: str | None = None,
    ordering: str | None = None,
) -> QuerySet[AIQuestionDraft]:
    qs = AIQuestionDraft.objects.all()
    if created_by is not None:
        qs = qs.filter(created_by=created_by)
    if status:
        qs = qs.filter(status=status)
    if exam:
        qs = qs.filter(exam=exam)
    if subject:
        qs = qs.filter(subject=subject)
    if topic:
        qs = qs.filter(topic=topic)
    if difficulty:
        qs = qs.filter(difficulty=difficulty)
    if language:
        qs = qs.filter(language=language)
    if provider:
        qs = qs.filter(provider=provider)
    if search:
        qs = qs.filter(
            Q(stem__icontains=search)
            | Q(exam__icontains=search)
            | Q(subject__icontains=search)
            | Q(topic__icontains=search)
        )
    return qs.order_by(_resolve_ordering(ordering))
