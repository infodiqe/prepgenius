"""
QuestionDraftService (Sprint-6A-04).

Orchestrates the full quarantine workflow:

    request → generate (6A-02) → validate + normalize (6A-03) → persist VALID
    ones as AIQuestionDraft(status=draft) → return draft DTOs + rejected reports

Reuses :class:`QuestionGenerationService` and :class:`QuestionValidationService`
(both injected, defaults provided) — no generation/validation logic is duplicated
here. **Invalid questions are never saved**; their validation reports are returned
so the caller can surface them. This is the ONLY path that writes AI content to
the DB, and it always writes Drafts — never ``questions.Question`` (PRD §7/§8).
"""
from __future__ import annotations

from typing import Any

from django.db import transaction

from ai.enums import PromptType
from ai.generation.draft_dto import DraftDTO, DraftGenerationResult, draft_to_dto
from ai.generation.dto import GeneratedQuestion, QuestionGenerationRequest
from ai.generation.service import QuestionGenerationService, build_generation_payload
from ai.prompts import render_prompt
from ai.quality import AIQualityAnalysisService, QualityContext
from ai.validation.dto import ValidatedQuestion
from ai.validation.service import QuestionValidationService


class QuestionDraftService:
    def __init__(
        self,
        generation_service: QuestionGenerationService | None = None,
        validation_service: QuestionValidationService | None = None,
        quality_service: AIQualityAnalysisService | None = None,
    ) -> None:
        self._generation = generation_service or QuestionGenerationService()
        self._validation = validation_service or QuestionValidationService()
        # Rule-based quality analysis runs AFTER validation, BEFORE persistence
        # (Sprint-6B-03). Advisory metadata only — never rejects/publishes.
        self._quality = quality_service or AIQualityAnalysisService()

    def generate_draft(
        self,
        request: QuestionGenerationRequest,
        *,
        created_by: Any | None = None,
    ) -> DraftGenerationResult:
        generation = self._generation.generate(request, created_by=created_by)

        valid: list[ValidatedQuestion] = []
        rejected: list[ValidatedQuestion] = []
        for question in generation.questions:
            validated = self._validation.validate(question)
            (valid if validated.valid else rejected).append(validated)

        prompt = self._render_prompt(request)
        drafts: list[DraftDTO] = []
        with transaction.atomic():
            for validated in valid:
                # Quality analysis (6B-03) runs after validation. Earlier drafts in
                # this same batch are already persisted, so they participate in the
                # "other generated drafts" duplicate corpus for later ones.
                analysis = self._quality.analyze(
                    validated=validated, context=self._quality_context(request)
                )
                draft = self._persist(
                    request, validated, generation, prompt, created_by, analysis
                )
                drafts.append(draft_to_dto(draft))

        return DraftGenerationResult(
            drafts=drafts,
            rejected=rejected,
            provider=generation.provider,
            model=generation.model,
            request_id=generation.request_id,
        )

    # ── Persistence ──────────────────────────────────────────────────────────
    def _persist(
        self,
        request: QuestionGenerationRequest,
        validated: ValidatedQuestion,
        generation: Any,
        prompt: str,
        created_by: Any | None,
        analysis: Any,
    ):
        # Imported lazily to keep model out of module-load import graph.
        from django.utils import timezone

        from ai.models import AIQuestionDraft, DraftStatus

        q: GeneratedQuestion = validated.normalized_question
        return AIQuestionDraft.objects.create(
            exam=request.exam,
            subject=request.subject,
            topic=request.topic,
            subtopic=request.subtopic or None,
            question_type=q.question_type,
            difficulty=q.difficulty,
            bloom_level=q.bloom_level,
            language=q.language,
            stem=q.stem,
            options=[o.to_dict() for o in q.options],
            correct_answer=q.correct_answer,
            explanation=q.explanation,
            learning_objective=q.learning_objective,
            estimated_time=q.estimated_time_seconds,
            tags=list(q.tags),
            confidence=q.confidence_score,
            generation_prompt=prompt,
            provider=generation.provider or "",
            model=generation.model or "",
            validation_report=validated.result.to_dict(),
            status=DraftStatus.GENERATED,
            created_by=created_by,
            # ── Quality metadata (6B-03) ─────────────────────────────────────
            quality_score=analysis.quality_score,
            quality_grade=analysis.quality_grade,
            duplicate_status=analysis.duplicate.classification,
            alignment_status=analysis.alignment.status,
            bloom_match=analysis.bloom.status,
            difficulty_match="match" if analysis.difficulty.match else "mismatch",
            quality_report=analysis.to_dict(),
            analysis_version=analysis.analysis_version,
            analysis_provider="rule_based",
            analysed_at=timezone.now(),
        )

    @staticmethod
    def _quality_context(request: QuestionGenerationRequest) -> QualityContext:
        return QualityContext(
            exam=request.exam,
            subject=request.subject,
            topic=request.topic,
            subtopic=request.subtopic or None,
            requested_difficulty=request.difficulty,
            requested_bloom=request.bloom_level,
            language=request.language,
        )

    def _render_prompt(self, request: QuestionGenerationRequest) -> str:
        rendered = render_prompt(
            PromptType.QUESTION_GENERATION, build_generation_payload(request)
        )
        return f"{rendered.system}\n\n{rendered.user}"
