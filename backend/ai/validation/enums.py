"""
Validation enumerations (Sprint-6A-03).

:class:`Severity` classifies an issue as fatal (``error`` → rejects the question)
or advisory (``warning`` → question is still valid). :class:`ValidationCode` is
the stable, machine-readable catalog of every issue the pipeline can emit, so
callers (and future sprints) can branch on codes rather than message strings.
"""
from django.db import models


class Severity(models.TextChoices):
    ERROR = "error", "Error"
    WARNING = "warning", "Warning"


class ValidationCode(models.TextChoices):
    # ── Errors (reject) ──────────────────────────────────────────────────────
    QUESTION_MISSING = "question_missing", "Question stem missing"
    EXPLANATION_MISSING = "explanation_missing", "Explanation missing"
    LEARNING_OBJECTIVE_MISSING = "learning_objective_missing", "Learning objective missing"
    OPTIONS_MISSING = "options_missing", "Options missing"
    TOO_FEW_OPTIONS = "too_few_options", "Fewer than four options"
    DUPLICATE_OPTIONS = "duplicate_options", "Duplicate options"
    EMPTY_OPTION_TEXT = "empty_option_text", "Empty option text"
    MULTIPLE_CORRECT = "multiple_correct", "More than one correct answer"
    NO_CORRECT = "no_correct", "No correct answer"
    UNSUPPORTED_DIFFICULTY = "unsupported_difficulty", "Unsupported difficulty"
    UNSUPPORTED_BLOOM = "unsupported_bloom", "Unsupported Bloom level"
    UNSUPPORTED_LANGUAGE = "unsupported_language", "Unsupported language"
    CONFIDENCE_OUT_OF_RANGE = "confidence_out_of_range", "Confidence outside 0-1"
    NON_POSITIVE_TIME = "non_positive_time", "Estimated time <= 0"
    MALFORMED_TAGS = "malformed_tags", "Malformed tags"
    # ── Warnings (advisory) ──────────────────────────────────────────────────
    TAGS_EMPTY = "tags_empty", "No tags provided"
    CONFIDENCE_MISSING = "confidence_missing", "No confidence score provided"
