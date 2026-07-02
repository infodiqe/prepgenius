"""
AI Output Validation & Normalization layer (Sprint-6A-03).

The single, provider-agnostic pipeline that normalizes and validates every
AI-generated question before any future sprint may persist it. Internal only —
no public endpoint; future generation flows call
:class:`ai.validation.service.QuestionValidationService` directly.
"""
from ai.validation.dto import ValidatedQuestion, ValidationIssue, ValidationResult
from ai.validation.enums import Severity, ValidationCode
from ai.validation.normalizer import QuestionNormalizer
from ai.validation.service import QuestionValidationService
from ai.validation.validators import (
    ValidationContext,
    Validator,
    default_validators,
)

__all__ = [
    "QuestionNormalizer",
    "QuestionValidationService",
    "Severity",
    "ValidatedQuestion",
    "ValidationCode",
    "ValidationContext",
    "ValidationIssue",
    "ValidationResult",
    "Validator",
    "default_validators",
]
