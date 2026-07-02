"""
AI Question Generation engine (Sprint-6A-02).

A reusable, stateless backend service that turns a strongly-typed generation
request into structured MCQ DTOs by calling the Sprint-6A-01 AI Gateway. It
never touches the database, never calls providers directly, and returns JSON-safe
structured data only. See :class:`ai.generation.service.QuestionGenerationService`.
"""
from ai.generation.dto import (
    GeneratedQuestion,
    QuestionGenerationRequest,
    QuestionGenerationResponse,
    QuestionOption,
)
from ai.generation.enums import BloomLevel, Difficulty, QuestionType
from ai.generation.service import QuestionGenerationService

__all__ = [
    "BloomLevel",
    "Difficulty",
    "GeneratedQuestion",
    "QuestionGenerationRequest",
    "QuestionGenerationResponse",
    "QuestionGenerationService",
    "QuestionOption",
    "QuestionType",
]
