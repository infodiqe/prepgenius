"""
QuestionValidationService (Sprint-6A-03).

The single, provider-agnostic pipeline that normalizes and validates every
AI-generated question before any future sprint may persist it. It:

    normalize → run validator pipeline → collect issues → build report

Normalization runs first so validators see clean, folded values; the normalized
question is always returned (even when invalid) so callers can inspect/repair.
No persistence, no HTTP, no exceptions for normal failures — the verdict is data.

The normalizer and validator pipeline are injected (defaults provided) so tests
and future sprints can extend the pipeline (dedup, curriculum alignment, AI
self-review, …) without touching existing validators.
"""
from __future__ import annotations

from ai.generation.dto import GeneratedQuestion
from ai.validation.dto import ValidatedQuestion, ValidationIssue, ValidationResult
from ai.validation.enums import Severity
from ai.validation.normalizer import QuestionNormalizer
from ai.validation.validators import ValidationContext, Validator, default_validators


class QuestionValidationService:
    def __init__(
        self,
        validators: list[Validator] | None = None,
        normalizer: QuestionNormalizer | None = None,
    ) -> None:
        self._normalizer = normalizer or QuestionNormalizer()
        self._validators = validators if validators is not None else default_validators()

    def validate(self, question: GeneratedQuestion) -> ValidatedQuestion:
        normalized = self._normalizer.normalize(question)
        ctx = ValidationContext(raw=question, normalized=normalized)

        issues: list[ValidationIssue] = []
        for validator in self._validators:
            issues.extend(validator.validate(ctx))

        errors = [i for i in issues if i.severity == Severity.ERROR.value]
        warnings = [i for i in issues if i.severity == Severity.WARNING.value]
        result = ValidationResult(valid=not errors, errors=errors, warnings=warnings)
        return ValidatedQuestion(normalized_question=normalized, result=result)

    def validate_many(self, questions: list[GeneratedQuestion]) -> list[ValidatedQuestion]:
        return [self.validate(q) for q in questions]
