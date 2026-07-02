"""
AIQuestionImportService (Sprint-6A-05).

The **bridge** from the AI staging area into the single, canonical Question
review pipeline. It maps an importable ``AIQuestionDraft`` onto a
``questions.Question`` using the EXISTING Question creation services
(``create_question`` + ``create_question_option``) — no review/approval/publish
logic is duplicated here. The created Question enters the review workflow exactly
like a manually authored one: ``review_status=draft``, ``origin="ai"`` (which the
existing publish policy already routes through SME review). Nothing is
auto-submitted, auto-approved, or auto-published.

After a successful import the draft is marked ``imported`` and linked to the new
Question; it then serves only as an immutable audit record — it is never reviewed,
approved, or published (its lifecycle is generated → imported/discarded).

The target ``exam``/``subtopic`` are supplied by the operator at import time
(the draft carries only free-text context), and ``create_question`` validates
that the subtopic belongs to the exam.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable
from uuid import UUID

from django.db import transaction
from django.utils import timezone

from ai.generation.exceptions import (
    DraftNotDiscardableError,
    DraftNotFoundError,
    DraftNotImportableError,
)
from ai.selectors import get_ai_draft
from questions.services import create_question, create_question_option

# Draft (string) difficulty → Question (SmallInteger) difficulty.
_DIFFICULTY_TO_INT = {"easy": 1, "medium": 2, "hard": 3}
_DEFAULT_DIFFICULTY = 2


@dataclass(frozen=True)
class ImportResult:
    question_id: str
    draft_id: str
    review_status: str
    origin: str
    imported_at: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "question_id": self.question_id,
            "draft_id": self.draft_id,
            "review_status": self.review_status,
            "origin": self.origin,
            "imported_at": self.imported_at,
        }


class AIQuestionImportService:
    def __init__(
        self,
        create_question_fn: Callable[..., Any] = create_question,
        create_option_fn: Callable[..., Any] = create_question_option,
    ) -> None:
        self._create_question = create_question_fn
        self._create_option = create_option_fn

    def import_draft(
        self,
        *,
        draft_id: UUID,
        exam_id: UUID,
        subtopic_id: UUID,
        created_by: Any | None = None,
    ) -> ImportResult:
        # Imported lazily to keep the model out of module-load import graph.
        from ai.models import AIQuestionDraft, DraftStatus

        draft = get_ai_draft(draft_id=draft_id)
        if draft is None:
            raise DraftNotFoundError(str(draft_id))
        if draft.status != DraftStatus.GENERATED:
            raise DraftNotImportableError(
                f"Draft {draft_id} is '{draft.status}', not importable "
                f"(only '{DraftStatus.GENERATED}' can be imported)."
            )

        with transaction.atomic():
            question = self._create_question(
                exam_id=exam_id,
                subtopic_id=subtopic_id,
                stem=draft.stem,
                explanation=draft.explanation or None,
                difficulty=_DIFFICULTY_TO_INT.get(draft.difficulty, _DEFAULT_DIFFICULTY),
                language=draft.language,
                origin="ai",
                tags=self._build_tags(draft),
            )
            self._create_options(question, draft)

            draft.status = DraftStatus.IMPORTED
            draft.imported_question = question
            draft.imported_at = timezone.now()
            draft.save(
                update_fields=[
                    "status",
                    "imported_question",
                    "imported_at",
                    "updated_at",
                ]
            )

        return ImportResult(
            question_id=str(question.id),
            draft_id=str(draft.id),
            review_status=question.review_status,
            origin=question.origin,
            imported_at=draft.imported_at.isoformat(),
        )

    def _create_options(self, question, draft: AIQuestionDraft) -> None:  # type: ignore[name-defined]
        for position, option in enumerate(draft.options or []):
            self._create_option(
                question_id=question.id,
                label=option.get("label", ""),
                body=option.get("text", ""),
                is_correct=bool(option.get("is_correct")),
                position=position,
            )

    @staticmethod
    def _build_tags(draft: AIQuestionDraft) -> dict:  # type: ignore[name-defined]
        # Preserve the AI topical tags on the Question (JSON dict). Full AI
        # provenance (provider/model/prompt/bloom/etc.) stays on the draft, which
        # is linked back via imported_question.
        return {"ai_tags": list(draft.tags)} if draft.tags else {}


def discard_draft(*, draft_id):
    """
    Mark a ``generated`` draft as ``discarded`` (operator abandons it). Only
    ``generated`` drafts can be discarded — an imported draft is an immutable
    audit record and a discarded one is terminal.
    """
    from ai.models import AIQuestionDraft, DraftStatus

    draft = get_ai_draft(draft_id=draft_id)
    if draft is None:
        raise DraftNotFoundError(str(draft_id))
    if draft.status != DraftStatus.GENERATED:
        raise DraftNotDiscardableError(
            f"Draft {draft_id} is '{draft.status}', only "
            f"'{DraftStatus.GENERATED}' drafts can be discarded."
        )
    draft.status = DraftStatus.DISCARDED
    draft.save(update_fields=["status", "updated_at"])
    return draft
