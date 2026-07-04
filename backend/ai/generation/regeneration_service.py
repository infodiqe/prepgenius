"""
DraftRegenerationService (Sprint-6B-02).

Lets a Content Manager *improve* an existing AI draft without regenerating the
whole batch:

    Generate → Draft → Preview → **Improve** → Review → Publish

It reuses everything from Sprint-6A / 6B-01 and adds no generation, validation, or
credit logic of its own:

* generation via :class:`QuestionGenerationService` (which calls the AI Gateway —
  reserve → call → commit/release credits and one AIRequest audit row per call);
* validation via :class:`QuestionValidationService`;
* persistence onto the EXISTING :class:`ai.models.AIQuestionDraft`.

Each regeneration produces ONE new version: the AI-generated fields on the draft
are replaced in place while the draft **id, audit, timestamps, status, provider
history, and imported linkage are preserved**. Every version — including the
original (version 1, snapshotted lazily) — is written to the append-only
:class:`ai.models.AIDraftRegeneration` table, which is never overwritten. That
append-only history is what makes version-compare and rollback possible and
satisfies the audit requirement (who / when / provider / model / tokens / cost /
feedback / version).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from ai.enums import PromptType
from ai.generation.dto import (
    GeneratedQuestion,
    QuestionGenerationRequest,
    QuestionGenerationResponse,
)
from ai.generation.exceptions import (
    DraftNotFoundError,
    DraftNotRegenerableError,
    DraftRegenerationInvalidError,
    RegenerationVersionNotFoundError,
)
from ai.generation.service import QuestionGenerationService, build_generation_payload
from ai.prompts import render_prompt
from ai.selectors import get_ai_draft
from ai.validation.dto import ValidatedQuestion
from ai.validation.service import QuestionValidationService


@dataclass(frozen=True)
class RegenerationOutcome:
    """Result of a regeneration: the updated draft + the new version record."""

    draft: Any  # ai.models.AIQuestionDraft (updated in place)
    regeneration: Any  # ai.models.AIDraftRegeneration (new immutable version)


def _normalize_provider(provider: str | None) -> str | None:
    """Map the operator's provider choice to a gateway argument ('auto' → None)."""
    if provider is None:
        return None
    value = provider.strip().lower()
    return None if value in ("", "auto") else value


def draft_to_generated_question(draft) -> GeneratedQuestion:
    """Rebuild a typed :class:`GeneratedQuestion` from a persisted draft's fields.

    Shared by the version-1 bootstrap snapshot and the review assistant (6B-04),
    which needs the current content as a validated question to analyse/improve.
    """
    from ai.generation.dto import QuestionOption

    options = [
        QuestionOption(
            label=str(o.get("label", "")),
            text=str(o.get("text", "")),
            is_correct=bool(o.get("is_correct")),
        )
        for o in (draft.options or [])
    ]
    return GeneratedQuestion(
        stem=draft.stem,
        options=options,
        correct_answer=draft.correct_answer,
        explanation=draft.explanation,
        difficulty=draft.difficulty,
        bloom_level=draft.bloom_level,
        estimated_time_seconds=draft.estimated_time,
        tags=list(draft.tags or []),
        learning_objective=draft.learning_objective,
        language=draft.language,
        question_type=draft.question_type,
        source="ai",
        confidence_score=draft.confidence,
    )


class DraftRegenerationService:
    def __init__(
        self,
        generation_service: QuestionGenerationService | None = None,
        validation_service: QuestionValidationService | None = None,
    ) -> None:
        self._generation = generation_service or QuestionGenerationService()
        self._validation = validation_service or QuestionValidationService()

    # ── Regenerate (Tasks 1, 2, 5, 6, 7) ─────────────────────────────────────
    def regenerate(
        self,
        *,
        draft_id: UUID,
        feedback: str | None = None,
        provider: str | None = None,
        created_by: Any | None = None,
    ) -> RegenerationOutcome:
        draft = get_ai_draft(draft_id=draft_id)
        self._assert_regenerable(draft, draft_id)

        feedback = (feedback or "").strip() or None
        provider = _normalize_provider(provider)
        request = self._build_request(draft, feedback)

        # AI call + credits are fully owned by the gateway (reserve → call →
        # commit on success / release on failure). Any provider/validation failure
        # raises before the draft is touched, so the existing draft is preserved.
        generation = self._generation.generate(
            request, created_by=created_by, provider=provider
        )
        validated = self._validation.validate(generation.questions[0])
        if not validated.valid:
            raise DraftRegenerationInvalidError(
                "Regenerated question failed validation; the draft was not changed.",
                report=validated.result.to_dict(),
            )

        prompt = self._render_prompt(request)
        return self.commit_version(
            draft_id=draft.pk,
            validated=validated,
            generation=generation,
            prompt=prompt,
            feedback=feedback,
            created_by=created_by,
        )

    # ── Rollback (Task 3) ────────────────────────────────────────────────────
    def rollback(
        self, *, draft_id: UUID, version: int, created_by: Any | None = None
    ):
        """
        Restore the draft's live content to an earlier version's snapshot. No AI
        call, no credits: it only re-points the draft at an existing (immutable)
        version. History is never overwritten.
        """
        from ai.models import AIQuestionDraft, DraftStatus

        draft = get_ai_draft(draft_id=draft_id)
        self._assert_regenerable(draft, draft_id)

        with transaction.atomic():
            locked = AIQuestionDraft.objects.select_for_update().get(pk=draft.pk)
            if locked.status != DraftStatus.GENERATED:
                raise DraftNotRegenerableError(
                    f"Draft {draft_id} is '{locked.status}', not regenerable."
                )
            self._ensure_original_snapshot(locked)
            target = locked.regenerations.filter(version=version).first()
            if target is None:
                raise RegenerationVersionNotFoundError(
                    f"Draft {draft_id} has no version {version}."
                )
            self._restore(locked, target)
        return locked

    # ── Internals ────────────────────────────────────────────────────────────
    @staticmethod
    def _assert_regenerable(draft, draft_id: UUID) -> None:
        from ai.models import DraftStatus

        if draft is None:
            raise DraftNotFoundError(str(draft_id))
        if draft.status != DraftStatus.GENERATED:
            raise DraftNotRegenerableError(
                f"Draft {draft_id} is '{draft.status}', not regenerable "
                f"(only '{DraftStatus.GENERATED}' drafts can be improved)."
            )

    @transaction.atomic
    def commit_version(
        self,
        *,
        draft_id: UUID,
        validated: ValidatedQuestion,
        generation: QuestionGenerationResponse,
        prompt: str,
        feedback: str | None = None,
        review_action: str = "",
        quality_before: Any | None = None,
        quality_after: Any | None = None,
        created_by: Any | None = None,
    ) -> RegenerationOutcome:
        """
        Persist ONE new immutable version from an already-generated + validated
        question, replacing the draft's live AI fields (id/audit/status preserved).
        Shared by regeneration (6B-02) and the review assistant (6B-04): the latter
        passes ``review_action`` and the ``quality_before``/``quality_after`` reports
        (objects with ``.to_dict()``), which are stored on the version row and, for
        ``quality_after``, mirrored onto the draft's quality columns.
        """
        from ai.models import AIQuestionDraft, DraftStatus

        locked = AIQuestionDraft.objects.select_for_update().get(pk=draft_id)
        if locked.status != DraftStatus.GENERATED:
            # Draft was imported/discarded between the AI call and here.
            raise DraftNotRegenerableError(
                f"Draft {draft_id} is '{locked.status}', not regenerable."
            )

        # Version 1 is the original content; snapshot it lazily so it survives the
        # in-place overwrite and remains comparable / rollback-able.
        self._ensure_original_snapshot(locked)
        version = self._next_version(locked)

        regeneration = self._record_version(
            draft=locked,
            version=version,
            question=validated.normalized_question,
            provider=generation.provider or "",
            model=generation.model or "",
            prompt=prompt,
            feedback=feedback or "",
            validation_report=validated.result.to_dict(),
            prompt_tokens=generation.prompt_tokens,
            completion_tokens=generation.completion_tokens,
            total_tokens=generation.total_tokens,
            cost=generation.cost,
            request_id=generation.request_id or "",
            created_by=created_by,
            is_original=False,
            review_action=review_action,
            quality_before=quality_before.to_dict() if quality_before else {},
            quality_after=quality_after.to_dict() if quality_after else {},
        )
        self._apply(locked, validated, generation, prompt, version, quality_after)
        return RegenerationOutcome(draft=locked, regeneration=regeneration)

    def _ensure_original_snapshot(self, draft) -> None:
        """Create the version-1 snapshot of the original content, once."""
        if draft.regenerations.exists():
            return
        q = draft_to_generated_question(draft)
        self._record_version(
            draft=draft,
            version=1,
            question=q,
            provider=draft.provider or "",
            model=draft.model or "",
            prompt=draft.generation_prompt or "",
            feedback="",
            validation_report=draft.validation_report or {},
            prompt_tokens=0,
            completion_tokens=0,
            total_tokens=0,
            cost=None,
            request_id="",
            created_by=draft.created_by,
            is_original=True,
        )

    @staticmethod
    def _next_version(draft) -> int:
        current_max = draft.regenerations.aggregate(m=Max("version"))["m"] or 0
        return current_max + 1

    @staticmethod
    def _record_version(
        *,
        draft,
        version: int,
        question: GeneratedQuestion,
        provider: str,
        model: str,
        prompt: str,
        feedback: str,
        validation_report: dict,
        prompt_tokens: int,
        completion_tokens: int,
        total_tokens: int,
        cost,
        request_id: str,
        created_by,
        is_original: bool,
        review_action: str = "",
        quality_before: dict | None = None,
        quality_after: dict | None = None,
    ):
        from decimal import Decimal

        from ai.models import AIDraftRegeneration

        return AIDraftRegeneration.objects.create(
            draft=draft,
            version=version,
            is_original=is_original,
            stem=question.stem,
            options=[o.to_dict() for o in question.options],
            correct_answer=question.correct_answer,
            explanation=question.explanation,
            difficulty=question.difficulty,
            bloom_level=question.bloom_level,
            learning_objective=question.learning_objective,
            estimated_time=question.estimated_time_seconds,
            tags=list(question.tags),
            confidence=question.confidence_score,
            language=question.language,
            question_type=question.question_type,
            provider=provider,
            model=model,
            generation_prompt=prompt,
            feedback=feedback,
            validation_report=validation_report,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            cost=cost if cost is not None else Decimal("0"),
            request_id=request_id,
            created_by=created_by,
            review_action=review_action,
            quality_before=quality_before or {},
            quality_after=quality_after or {},
        )

    @staticmethod
    def _apply(
        draft,
        validated: ValidatedQuestion,
        generation: QuestionGenerationResponse,
        prompt: str,
        version: int,
        quality_after: Any | None = None,
    ) -> None:
        """Replace only the AI-generated fields; preserve id/audit/status/etc."""
        q = validated.normalized_question
        draft.stem = q.stem
        draft.options = [o.to_dict() for o in q.options]
        draft.correct_answer = q.correct_answer
        draft.explanation = q.explanation
        draft.difficulty = q.difficulty
        draft.bloom_level = q.bloom_level
        draft.learning_objective = q.learning_objective
        draft.estimated_time = q.estimated_time_seconds
        draft.tags = list(q.tags)
        draft.confidence = q.confidence_score
        draft.language = q.language
        draft.generation_prompt = prompt
        draft.provider = generation.provider or ""
        draft.model = generation.model or ""
        draft.validation_report = validated.result.to_dict()
        draft.regeneration_count = draft.regeneration_count + 1
        draft.current_version = version
        draft.regenerated_at = timezone.now()
        update_fields = [
            "stem",
            "options",
            "correct_answer",
            "explanation",
            "difficulty",
            "bloom_level",
            "learning_objective",
            "estimated_time",
            "tags",
            "confidence",
            "language",
            "generation_prompt",
            "provider",
            "model",
            "validation_report",
            "regeneration_count",
            "current_version",
            "regenerated_at",
            "updated_at",
        ]

        # Review improvements re-run quality analysis, so mirror the fresh report
        # onto the draft's quality columns/badges (Sprint-6B-04). Plain
        # regenerations pass ``None`` and leave the existing quality columns as-is.
        if quality_after is not None:
            draft.quality_score = quality_after.quality_score
            draft.quality_grade = quality_after.quality_grade
            draft.duplicate_status = quality_after.duplicate.classification
            draft.alignment_status = quality_after.alignment.status
            draft.bloom_match = quality_after.bloom.status
            draft.difficulty_match = (
                "match" if quality_after.difficulty.match else "mismatch"
            )
            draft.quality_report = quality_after.to_dict()
            draft.analysis_version = quality_after.analysis_version
            draft.analysis_provider = "rule_based"
            draft.analysed_at = timezone.now()
            update_fields += [
                "quality_score",
                "quality_grade",
                "duplicate_status",
                "alignment_status",
                "bloom_match",
                "difficulty_match",
                "quality_report",
                "analysis_version",
                "analysis_provider",
                "analysed_at",
            ]

        draft.save(update_fields=update_fields)

    @staticmethod
    def _restore(draft, snapshot) -> None:
        draft.stem = snapshot.stem
        draft.options = snapshot.options
        draft.correct_answer = snapshot.correct_answer
        draft.explanation = snapshot.explanation
        draft.difficulty = snapshot.difficulty
        draft.bloom_level = snapshot.bloom_level
        draft.learning_objective = snapshot.learning_objective
        draft.estimated_time = snapshot.estimated_time
        draft.tags = snapshot.tags
        draft.confidence = snapshot.confidence
        draft.language = snapshot.language
        draft.generation_prompt = snapshot.generation_prompt
        draft.provider = snapshot.provider
        draft.model = snapshot.model
        draft.validation_report = snapshot.validation_report
        draft.current_version = snapshot.version
        draft.save(
            update_fields=[
                "stem",
                "options",
                "correct_answer",
                "explanation",
                "difficulty",
                "bloom_level",
                "learning_objective",
                "estimated_time",
                "tags",
                "confidence",
                "language",
                "generation_prompt",
                "provider",
                "model",
                "validation_report",
                "current_version",
                "updated_at",
            ]
        )

    @staticmethod
    def _build_request(draft, feedback: str | None) -> QuestionGenerationRequest:
        # Regenerate ONE improved version, reusing the draft's generation context.
        # Operator feedback augments the prompt via ``additional_instructions`` —
        # the system prompt (in the registry) is never replaced (Task 2).
        return QuestionGenerationRequest(
            exam=draft.exam,
            subject=draft.subject,
            topic=draft.topic,
            subtopic=draft.subtopic or None,
            difficulty=draft.difficulty,
            bloom_level=draft.bloom_level,
            question_type=draft.question_type,
            language=draft.language,
            count=1,
            additional_instructions=feedback,
        )

    @staticmethod
    def _render_prompt(request: QuestionGenerationRequest) -> str:
        rendered = render_prompt(
            PromptType.QUESTION_GENERATION, build_generation_payload(request)
        )
        return f"{rendered.system}\n\n{rendered.user}"
