"""
Draft-regeneration selectors — reads only (Sprint-6B-02).

Pure readers over :class:`ai.models.AIDraftRegeneration`. No mutations, no business
logic. They back the regeneration-history view (Task 3), the feedback history
(Task 2), and the backend-only version comparison (Task 4).
"""
from __future__ import annotations

from typing import Any

from django.db.models import QuerySet

from ai.models import AIDraftRegeneration

#: AI-generated content fields a version comparison highlights (Task 4).
CONTENT_FIELDS: tuple[str, ...] = (
    "stem",
    "options",
    "correct_answer",
    "explanation",
    "difficulty",
    "bloom_level",
    "learning_objective",
)


def list_draft_regenerations(*, draft_id) -> QuerySet[AIDraftRegeneration]:
    """Every version of a draft, oldest → newest (append-only history)."""
    return AIDraftRegeneration.objects.filter(draft_id=draft_id).order_by("version")


def get_draft_regeneration(*, draft_id, version: int) -> AIDraftRegeneration | None:
    return AIDraftRegeneration.objects.filter(
        draft_id=draft_id, version=version
    ).first()


def _snapshot_fields(row: AIDraftRegeneration) -> dict[str, Any]:
    return {field: getattr(row, field) for field in CONTENT_FIELDS}


def compare_draft_versions(
    *,
    draft,
    current_version: int | None = None,
    previous_version: int | None = None,
) -> dict[str, Any] | None:
    """
    Backend-only version diff (Task 4): the current version vs. a previous one,
    with a per-field ``changed`` highlight over the AI-generated content fields
    (stem, options, correct answer, explanation, difficulty, bloom, learning
    objective).

    Defaults compare the draft's live version against the version immediately
    preceding it. Returns ``None`` when the draft has no regeneration history yet,
    or when the requested current version does not exist. When there is no earlier
    version to compare against, ``previous`` is ``None`` and every field is marked
    changed=false.
    """
    rows = {r.version: r for r in list_draft_regenerations(draft_id=draft.id)}
    if not rows:
        return None

    cur_ver = current_version if current_version is not None else draft.current_version
    current = rows.get(cur_ver)
    if current is None:
        return None

    if previous_version is not None:
        previous = rows.get(previous_version)
    else:
        earlier = [v for v in rows if v < cur_ver]
        previous = rows[max(earlier)] if earlier else None

    cur_fields = _snapshot_fields(current)
    prev_fields = _snapshot_fields(previous) if previous is not None else None

    diff: dict[str, dict[str, Any]] = {}
    for field in CONTENT_FIELDS:
        cur_value = cur_fields[field]
        prev_value = prev_fields[field] if prev_fields is not None else None
        diff[field] = {
            "changed": prev_fields is not None and cur_value != prev_value,
            "previous": prev_value,
            "current": cur_value,
        }

    return {
        "current_version": current.version,
        "previous_version": previous.version if previous is not None else None,
        "diff": diff,
    }
