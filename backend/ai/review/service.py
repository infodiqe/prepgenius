"""
AIReviewAssistantService (Sprint-6B-04, Task 3).

AI-assisted improvement of an EXISTING draft while the reviewer stays in control:
the reviewer picks an action, the AI proposes an improved question, and the result
is committed as a NEW immutable draft version. Nothing is auto-edited, approved, or
published; the existing review workflow remains the source of truth.

It composes — never duplicates — the existing services:

* generation via :meth:`QuestionGenerationService.improve` (same gateway + parse
  pipeline; credits reserved/committed/released by the gateway — Task 7);
* validation via :class:`QuestionValidationService`;
* quality analysis via :class:`AIQualityAnalysisService` (run again on the result —
  Task 4);
* version history via :meth:`DraftRegenerationService.commit_version` (append-only,
  never overwritten — Task 8).
"""
from __future__ import annotations

from typing import Any
from uuid import UUID

from ai.generation.dto import QuestionGenerationRequest
from ai.generation.exceptions import (
    DraftNotFoundError,
    DraftNotRegenerableError,
    DraftRegenerationInvalidError,
)
from ai.generation.regeneration_service import (
    DraftRegenerationService,
    _normalize_provider,
    draft_to_generated_question,
)
from ai.generation.service import QuestionGenerationService
from ai.prompts import render_prompt
from ai.quality import AIQualityAnalysisService, QualityContext
from ai.review.dto import (
    ReviewImprovementOutcome,
    ReviewRecommendation,
    ReviewRecommendations,
    compare_quality,
)
from ai.review.enums import ReviewAction, prompt_type_for
from ai.selectors import get_ai_draft
from ai.validation.service import QuestionValidationService

_DIFFICULTY_ORDER = {"easy": 0, "medium": 1, "hard": 2}


class AIReviewAssistantService:
    def __init__(
        self,
        generation_service: QuestionGenerationService | None = None,
        validation_service: QuestionValidationService | None = None,
        quality_service: AIQualityAnalysisService | None = None,
        regeneration_service: DraftRegenerationService | None = None,
    ) -> None:
        self._generation = generation_service or QuestionGenerationService()
        self._validation = validation_service or QuestionValidationService()
        self._quality = quality_service or AIQualityAnalysisService()
        # Reuses the 6B-02 version-history commit (append-only) via composition.
        self._regeneration = regeneration_service or DraftRegenerationService()

    # ── Task 5: Recommendations (no AI) ──────────────────────────────────────
    def recommend(self, *, draft_id: UUID) -> ReviewRecommendations:
        draft = get_ai_draft(draft_id=draft_id)
        if draft is None:
            raise DraftNotFoundError(str(draft_id))
        analysis = self._analyze_current(draft)
        return ReviewRecommendations(
            draft_id=str(draft.id),
            quality_score=analysis.quality_score,
            quality_grade=analysis.quality_grade,
            recommendations=_build_recommendations(analysis, draft),
        )

    # ── Tasks 1/3/4/7/8: Apply an AI improvement ─────────────────────────────
    def improve(
        self,
        *,
        draft_id: UUID,
        action: str,
        instructions: str | None = None,
        provider: str | None = None,
        created_by: Any | None = None,
    ) -> ReviewImprovementOutcome:
        draft = get_ai_draft(draft_id=draft_id)
        self._assert_improvable(draft, draft_id)

        action_value = ReviewAction(action).value  # validates the action
        prompt_type = prompt_type_for(action_value)
        instructions = (instructions or "").strip() or None
        provider = _normalize_provider(provider)

        context = self._context_request(draft)
        payload = self._build_payload(draft, instructions)

        # Quality BEFORE (current content), reusing validation + quality analysis.
        quality_before = self._analyze_current(draft)

        # AI improvement through the SAME gateway pipeline (credits: reserve → call
        # → commit on success / release on failure). Any provider/validation failure
        # raises before the draft is touched, so the existing draft is preserved.
        generation = self._generation.improve(
            prompt_type=prompt_type,
            payload=payload,
            context=context,
            created_by=created_by,
            provider=provider,
            credit_units=1,
        )
        validated = self._validation.validate(generation.questions[0])
        if not validated.valid:
            raise DraftRegenerationInvalidError(
                "AI improvement failed validation; the draft was not changed.",
                report=validated.result.to_dict(),
            )

        # Quality AFTER (Task 4).
        quality_after = self._quality.analyze(
            validated=validated, context=self._quality_context(draft)
        )

        prompt_text = self._render_prompt(prompt_type, payload)
        outcome = self._regeneration.commit_version(
            draft_id=draft.pk,
            validated=validated,
            generation=generation,
            prompt=prompt_text,
            feedback=instructions or "",
            review_action=action_value,
            quality_before=quality_before,
            quality_after=quality_after,
            created_by=created_by,
        )
        return ReviewImprovementOutcome(
            draft=outcome.draft,
            regeneration=outcome.regeneration,
            comparison=compare_quality(quality_before, quality_after),
        )

    # ── Internals ────────────────────────────────────────────────────────────
    @staticmethod
    def _assert_improvable(draft, draft_id: UUID) -> None:
        from ai.models import DraftStatus

        if draft is None:
            raise DraftNotFoundError(str(draft_id))
        if draft.status != DraftStatus.GENERATED:
            raise DraftNotRegenerableError(
                f"Draft {draft_id} is '{draft.status}', not improvable "
                f"(only '{DraftStatus.GENERATED}' drafts can be improved)."
            )

    def _analyze_current(self, draft):
        validated = self._validation.validate(draft_to_generated_question(draft))
        return self._quality.analyze(
            validated=validated, context=self._quality_context(draft)
        )

    @staticmethod
    def _quality_context(draft) -> QualityContext:
        return QualityContext(
            exam=draft.exam,
            subject=draft.subject,
            topic=draft.topic,
            subtopic=draft.subtopic or None,
            requested_difficulty=draft.difficulty,
            requested_bloom=draft.bloom_level,
            language=draft.language,
            exclude_draft_id=draft.id,
        )

    @staticmethod
    def _context_request(draft) -> QuestionGenerationRequest:
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
            additional_instructions=None,
        )

    @staticmethod
    def _build_payload(draft, instructions: str | None) -> dict[str, Any]:
        options_block = "\n".join(
            f"{o.get('label', '')}) {o.get('text', '')}"
            + (" [correct]" if o.get("is_correct") else "")
            for o in (draft.options or [])
        )
        # Every value is a non-None string so the rendered prompt never contains
        # the literal "None" (the registry leaves omitted placeholders empty).
        return {
            "exam": draft.exam or "",
            "subject": draft.subject or "",
            "topic": draft.topic or "",
            "subtopic": draft.subtopic or "not specified",
            "difficulty": draft.difficulty or "",
            "bloom_level": draft.bloom_level or "",
            "language": draft.language or "",
            "stem": draft.stem or "",
            "options_block": options_block,
            "correct_answer": draft.correct_answer or "",
            "explanation": draft.explanation or "",
            "learning_objective": draft.learning_objective or "none",
            "reviewer_instructions": instructions or "none",
        }

    @staticmethod
    def _render_prompt(prompt_type, payload: dict[str, Any]) -> str:
        rendered = render_prompt(prompt_type, payload)
        return f"{rendered.system}\n\n{rendered.user}"


def _build_recommendations(analysis, draft) -> list[ReviewRecommendation]:
    """Map the reused quality signals → suggested review actions (Task 5, no AI)."""
    recs: list[ReviewRecommendation] = []

    if analysis.explanation.warnings:
        recs.append(
            ReviewRecommendation(
                "explanation_weak",
                ReviewAction.IMPROVE_EXPLANATION.value,
                "The explanation has quality warnings.",
                "warning",
            )
        )
    if not (draft.learning_objective or "").strip():
        recs.append(
            ReviewRecommendation(
                "missing_learning_objective",
                ReviewAction.IMPROVE_LEARNING_OBJECTIVE.value,
                "No learning objective is set.",
                "warning",
            )
        )
    if analysis.distractors.warnings:
        recs.append(
            ReviewRecommendation(
                "weak_distractors",
                ReviewAction.IMPROVE_DISTRACTORS.value,
                "One or more distractors have quality warnings.",
                "warning",
            )
        )
    if not analysis.difficulty.match:
        est = _DIFFICULTY_ORDER.get(analysis.difficulty.estimated, 1)
        req = _DIFFICULTY_ORDER.get(analysis.difficulty.requested, 1)
        action = (
            ReviewAction.INCREASE_DIFFICULTY.value
            if est < req
            else ReviewAction.REDUCE_DIFFICULTY.value
        )
        recs.append(
            ReviewRecommendation(
                "difficulty_mismatch",
                action,
                f"Reads as '{analysis.difficulty.estimated}' but "
                f"'{analysis.difficulty.requested}' was requested.",
                "warning",
            )
        )
    if analysis.bloom.status != "match":
        recs.append(
            ReviewRecommendation(
                "bloom_mismatch",
                ReviewAction.IMPROVE_BLOOM.value,
                f"Bloom level is {analysis.bloom.status} than requested.",
                "warning",
            )
        )
    if analysis.duplicate.classification != "unique":
        recs.append(
            ReviewRecommendation(
                "possible_duplicate",
                ReviewAction.ADD_SCENARIO.value,
                "Similar to an existing question; consider differentiating it.",
                "warning",
            )
        )
    if analysis.alignment.status != "aligned":
        recs.append(
            ReviewRecommendation(
                "weak_alignment",
                ReviewAction.REWRITE_STEM.value,
                analysis.alignment.reason,
                "warning",
            )
        )

    if not recs:
        recs.append(
            ReviewRecommendation(
                "looks_good",
                "",
                "No quality issues detected; the draft looks strong.",
                "info",
            )
        )
    return recs
