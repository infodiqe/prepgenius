"""
Question-generation enumerations and capability catalog (Sprint-6A-02).

:class:`QuestionType` declares every type the engine is *designed* to support so
the API can validate and message about them, but only the members in
:data:`SUPPORTED_QUESTION_TYPES` are actually implemented this sprint (single
correct MCQ). Adding a new type later = add it to the supported set + extend the
mapper; the request/DTO/prompt plumbing already accommodates it.
"""
from __future__ import annotations

from django.conf import settings
from django.db import models


class QuestionType(models.TextChoices):
    SINGLE_CORRECT = "single_correct", "Single Correct MCQ"
    # Declared for forward-compatibility — NOT implemented this sprint. Requests
    # for these are rejected with a clear "not yet supported" error.
    MULTI_CORRECT = "multi_correct", "Multiple Correct MCQ"
    ASSERTION_REASON = "assertion_reason", "Assertion Reason"
    MATCH_THE_FOLLOWING = "match_the_following", "Match the Following"
    TRUE_FALSE = "true_false", "True / False"
    CASE_STUDY = "case_study", "Case Study"
    PASSAGE_BASED = "passage_based", "Passage Based"


#: Question types actually implemented this sprint.
SUPPORTED_QUESTION_TYPES: frozenset[str] = frozenset({QuestionType.SINGLE_CORRECT.value})


class Difficulty(models.TextChoices):
    EASY = "easy", "Easy"
    MEDIUM = "medium", "Medium"
    HARD = "hard", "Hard"


class BloomLevel(models.TextChoices):
    REMEMBER = "remember", "Remember"
    UNDERSTAND = "understand", "Understand"
    APPLY = "apply", "Apply"
    ANALYZE = "analyze", "Analyze"
    EVALUATE = "evaluate", "Evaluate"
    CREATE = "create", "Create"


#: Upper bound on questions per request (bounds prompt size, latency, and cost).
MAX_QUESTIONS_PER_REQUEST = 20


def supported_languages() -> dict[str, str]:
    """
    Supported language code → display name, derived from Django's configured
    ``LANGUAGES`` (Assamese-first per PRD §4.1) so it stays in sync with the app.
    """
    return {code: str(name) for code, name in settings.LANGUAGES}
