"""
Validation result DTOs (Sprint-6A-03).

Structured, JSON-safe results only — normal validation failures are data, never
exceptions. ``ValidatedQuestion`` is the full report: the normalized question
(a reused :class:`ai.generation.dto.GeneratedQuestion`) plus its verdict.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from ai.generation.dto import GeneratedQuestion


@dataclass(frozen=True)
class ValidationIssue:
    code: str
    severity: str
    field: str
    message: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "code": self.code,
            "severity": self.severity,
            "field": self.field,
            "message": self.message,
        }


@dataclass(frozen=True)
class ValidationResult:
    valid: bool
    errors: list[ValidationIssue]
    warnings: list[ValidationIssue]

    def to_dict(self) -> dict[str, Any]:
        return {
            "valid": self.valid,
            "errors": [i.to_dict() for i in self.errors],
            "warnings": [i.to_dict() for i in self.warnings],
        }


@dataclass(frozen=True)
class ValidatedQuestion:
    """The validation report: normalized question + verdict."""

    normalized_question: GeneratedQuestion
    result: ValidationResult

    @property
    def valid(self) -> bool:
        return self.result.valid

    @property
    def errors(self) -> list[ValidationIssue]:
        return self.result.errors

    @property
    def warnings(self) -> list[ValidationIssue]:
        return self.result.warnings

    def to_dict(self) -> dict[str, Any]:
        return {
            "valid": self.result.valid,
            "errors": [i.to_dict() for i in self.result.errors],
            "warnings": [i.to_dict() for i in self.result.warnings],
            "normalized_question": self.normalized_question.to_dict(),
        }
