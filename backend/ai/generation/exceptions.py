"""
Question-generation domain exceptions (Sprint-6A-02).

Split into two families the API layer maps to distinct HTTP statuses:

* **Request errors** (caller's fault → 4xx): invalid request, unsupported
  question type, unsupported language.
* **Generation/provider errors** (upstream fault → 5xx): provider unavailable,
  timeout, empty response, or an unparseable/invalid AI response.
"""
from __future__ import annotations


class QuestionGenerationError(Exception):
    """Base class for all question-generation failures."""


# ── Request (4xx) ────────────────────────────────────────────────────────────
class InvalidGenerationRequestError(QuestionGenerationError):
    """The generation request failed business validation."""


class UnsupportedQuestionTypeError(QuestionGenerationError):
    """The requested question type is not implemented this sprint."""


class UnsupportedLanguageError(QuestionGenerationError):
    """The requested language is not supported by the platform."""


# ── Generation / provider (5xx) ──────────────────────────────────────────────
class ProviderUnavailableError(QuestionGenerationError):
    """Every provider in the gateway fallback chain failed."""


class GenerationTimeoutError(QuestionGenerationError):
    """The gateway call timed out across all providers."""


class EmptyGenerationResponseError(QuestionGenerationError):
    """The AI returned an empty response or zero questions."""


class InvalidGenerationResponseError(QuestionGenerationError):
    """The AI response was not valid JSON or did not match the schema."""


# ── Draft import (Sprint-6A-05) ──────────────────────────────────────────────
class DraftImportError(Exception):
    """Base class for draft → Question import failures."""


class DraftNotFoundError(DraftImportError):
    """The requested draft does not exist."""


class DraftNotImportableError(DraftImportError):
    """
    The draft is not in an importable state (only ``generated`` may be imported).
    Covers already-imported and discarded drafts.
    """


class DraftNotDiscardableError(DraftImportError):
    """The draft cannot be discarded (only ``generated`` drafts may be discarded)."""
