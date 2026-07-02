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
from ai.validation.dto import ValidatedQuestion
from ai.validation.service import QuestionValidationService


class QuestionDraftService:
    def __init__(
        self,
        generation_service: QuestionGenerationService | None = None,
        validation_service: QuestionValidationService | None = None,
    ) -> None:
        self._generation = generation_service or QuestionGenerationService()
        self._validation = validation_service or QuestionValidationService()

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
                draft = self._persist(request, validated, generation, prompt, created_by)
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
    ):
        # Imported lazily to keep model out of module-load import graph.
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
        )

    def _render_prompt(self, request: QuestionGenerationRequest) -> str:
        rendered = render_prompt(
            PromptType.QUESTION_GENERATION, build_generation_payload(request)
        )
        return f"{rendered.system}\n\n{rendered.user}"
