"""
Quality / duplicate-corpus selectors — reads only (Sprint-6B-03).

Builds the duplicate-detection corpus (Task 2) the quality engine compares a draft
against, over the SAME corpus a future pgvector dedup will use:

* **Published questions** — ``questions.Question`` with ``review_status=published``
* **Imported AI questions** — ``questions.Question`` with ``origin=ai``
* **Other generated drafts** — ``ai.AIQuestionDraft`` with ``status=generated``

Cross-app reads only (no writes). Scoped to the draft's exam where possible to keep
the scan bounded and comparisons meaningful; when the exam cannot be resolved the
question corpus is simply empty (→ the draft reads as unique — never a false
rejection). Returns lightweight :class:`ai.quality.dto.CorpusEntry` rows.
"""
from __future__ import annotations

from django.db.models import Q

from ai.models import AIQuestionDraft, DraftStatus
from ai.quality.dto import CorpusEntry


def get_duplicate_candidates(
    *,
    exam: str,
    language: str | None = None,
    exclude_draft_id=None,
    limit: int = 500,
) -> list[CorpusEntry]:
    entries: list[CorpusEntry] = []
    entries.extend(_question_candidates(exam=exam, limit=limit))
    entries.extend(
        _draft_candidates(exam=exam, exclude_draft_id=exclude_draft_id, limit=limit)
    )
    return entries


def _question_candidates(*, exam: str, limit: int) -> list[CorpusEntry]:
    from questions.models import Question

    qs = (
        Question.objects.filter(Q(review_status="published") | Q(origin="ai"))
        .filter(exam__code__iexact=exam)
        .order_by("-created_at")
        .values("id", "stem", "origin", "review_status")[:limit]
    )
    result: list[CorpusEntry] = []
    for row in qs:
        kind = "imported_ai" if row["origin"] == "ai" else "published"
        result.append(
            CorpusEntry(question_id=str(row["id"]), stem=row["stem"], kind=kind)
        )
    return result


def _draft_candidates(
    *, exam: str, exclude_draft_id, limit: int
) -> list[CorpusEntry]:
    qs = AIQuestionDraft.objects.filter(
        status=DraftStatus.GENERATED, exam=exam
    )
    if exclude_draft_id is not None:
        qs = qs.exclude(pk=exclude_draft_id)
    qs = qs.order_by("-created_at").values("id", "stem")[:limit]
    return [
        CorpusEntry(question_id=str(row["id"]), stem=row["stem"], kind="draft")
        for row in qs
    ]
