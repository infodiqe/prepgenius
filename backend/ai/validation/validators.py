"""
Validator pipeline (Sprint-6A-03).

Each validator is a small, independent unit implementing :class:`Validator` and
emitting :class:`ValidationIssue` objects (never raising for normal failures).
The service runs an ordered list of validators, so new validators — duplicate
detection, curriculum alignment, AI self-review, human review, translation
validation, difficulty scoring — are added by appending to the pipeline WITHOUT
modifying any existing validator.

Validators read from a :class:`ValidationContext` carrying both the ``raw`` input
and the ``normalized`` question (plus room for future inputs like exam config or
a corpus for dedup). Most rules inspect ``normalized`` (so whitespace/synonyms
are already handled); the malformed-tags rule inspects ``raw`` (normalization
coerces tags, so the raw shape is where malformation is visible).
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from ai.generation.dto import GeneratedQuestion
from ai.generation.enums import BloomLevel, Difficulty
from ai.validation.dto import ValidationIssue
from ai.validation.enums import Severity, ValidationCode
from ai.validation.normalizer import supported_language_codes


@dataclass(frozen=True)
class ValidationContext:
    """Inputs available to every validator. Extensible for future validators."""

    raw: GeneratedQuestion
    normalized: GeneratedQuestion
    # Reserved for future validators (dedup corpus, exam blueprint, etc.).
    extra: dict[str, Any] = field(default_factory=dict)


def _issue(code: ValidationCode, field_name: str, message: str, severity: Severity) -> ValidationIssue:
    return ValidationIssue(
        code=code.value, severity=severity.value, field=field_name, message=message
    )


def _error(code: ValidationCode, field_name: str, message: str) -> ValidationIssue:
    return _issue(code, field_name, message, Severity.ERROR)


def _warning(code: ValidationCode, field_name: str, message: str) -> ValidationIssue:
    return _issue(code, field_name, message, Severity.WARNING)


class Validator(ABC):
    """Base class for a single validation concern."""

    @abstractmethod
    def validate(self, ctx: ValidationContext) -> list[ValidationIssue]:
        raise NotImplementedError  # pragma: no cover - abstract


class RequiredContentValidator(Validator):
    """Stem, explanation, and learning objective must be present."""

    def validate(self, ctx: ValidationContext) -> list[ValidationIssue]:
        q = ctx.normalized
        issues: list[ValidationIssue] = []
        if not q.stem:
            issues.append(_error(ValidationCode.QUESTION_MISSING, "stem", "Question stem is missing."))
        if not q.explanation:
            issues.append(
                _error(ValidationCode.EXPLANATION_MISSING, "explanation", "Explanation is missing.")
            )
        if not q.learning_objective:
            issues.append(
                _error(
                    ValidationCode.LEARNING_OBJECTIVE_MISSING,
                    "learning_objective",
                    "Learning objective is missing.",
                )
            )
        return issues


class OptionsStructureValidator(Validator):
    """Options must exist, number at least four, be non-empty and unique."""

    MIN_OPTIONS = 4

    def validate(self, ctx: ValidationContext) -> list[ValidationIssue]:
        options = ctx.normalized.options
        issues: list[ValidationIssue] = []

        if not options:
            issues.append(_error(ValidationCode.OPTIONS_MISSING, "options", "Options are missing."))
            return issues

        if len(options) < self.MIN_OPTIONS:
            issues.append(
                _error(
                    ValidationCode.TOO_FEW_OPTIONS,
                    "options",
                    f"At least {self.MIN_OPTIONS} options are required; got {len(options)}.",
                )
            )

        if any(not o.text for o in options):
            issues.append(
                _error(ValidationCode.EMPTY_OPTION_TEXT, "options", "One or more options are empty.")
            )

        texts = [o.text.casefold() for o in options if o.text]
        if len(set(texts)) != len(texts):
            issues.append(
                _error(ValidationCode.DUPLICATE_OPTIONS, "options", "Options must be unique.")
            )
        return issues


class CorrectnessValidator(Validator):
    """Exactly one option must be flagged correct."""

    def validate(self, ctx: ValidationContext) -> list[ValidationIssue]:
        options = ctx.normalized.options
        if not options:
            return []  # OptionsStructureValidator already reports the missing options.
        correct = sum(1 for o in options if o.is_correct)
        if correct == 0:
            return [_error(ValidationCode.NO_CORRECT, "options", "No correct answer is marked.")]
        if correct > 1:
            return [
                _error(
                    ValidationCode.MULTIPLE_CORRECT,
                    "options",
                    f"Exactly one correct answer is allowed; got {correct}.",
                )
            ]
        return []


class TaxonomyValidator(Validator):
    """Difficulty, Bloom level, and language must be supported values."""

    def validate(self, ctx: ValidationContext) -> list[ValidationIssue]:
        q = ctx.normalized
        issues: list[ValidationIssue] = []
        if q.difficulty not in Difficulty.values:
            issues.append(
                _error(
                    ValidationCode.UNSUPPORTED_DIFFICULTY,
                    "difficulty",
                    f"Unsupported difficulty: '{q.difficulty}'.",
                )
            )
        if q.bloom_level not in BloomLevel.values:
            issues.append(
                _error(
                    ValidationCode.UNSUPPORTED_BLOOM,
                    "bloom_level",
                    f"Unsupported Bloom level: '{q.bloom_level}'.",
                )
            )
        if q.language not in supported_language_codes():
            issues.append(
                _error(
                    ValidationCode.UNSUPPORTED_LANGUAGE,
                    "language",
                    f"Unsupported language: '{q.language}'.",
                )
            )
        return issues


class MetadataValidator(Validator):
    """Confidence range, estimated time, and tag well-formedness."""

    def validate(self, ctx: ValidationContext) -> list[ValidationIssue]:
        q = ctx.normalized
        issues: list[ValidationIssue] = []

        if q.confidence_score is None:
            issues.append(
                _warning(
                    ValidationCode.CONFIDENCE_MISSING,
                    "confidence_score",
                    "No confidence score provided.",
                )
            )
        elif not (0.0 <= q.confidence_score <= 1.0):
            issues.append(
                _error(
                    ValidationCode.CONFIDENCE_OUT_OF_RANGE,
                    "confidence_score",
                    "Confidence score must be between 0 and 1.",
                )
            )

        if not isinstance(q.estimated_time_seconds, int) or q.estimated_time_seconds <= 0:
            issues.append(
                _error(
                    ValidationCode.NON_POSITIVE_TIME,
                    "estimated_time_seconds",
                    "Estimated time must be a positive integer.",
                )
            )

        raw_tags = ctx.raw.tags
        if not isinstance(raw_tags, list) or any(
            not isinstance(t, str) or not t.strip() for t in raw_tags
        ):
            issues.append(
                _error(ValidationCode.MALFORMED_TAGS, "tags", "Tags must be a list of non-empty strings.")
            )
        elif not q.tags:
            issues.append(_warning(ValidationCode.TAGS_EMPTY, "tags", "No tags provided."))
        return issues


def default_validators() -> list[Validator]:
    """The default validation pipeline. Append here to add new validators."""
    return [
        RequiredContentValidator(),
        OptionsStructureValidator(),
        CorrectnessValidator(),
        TaxonomyValidator(),
        MetadataValidator(),
    ]
