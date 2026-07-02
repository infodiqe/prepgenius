"""
AI Gateway enumerations (Sprint-6A-01).

These are the stable identifiers the whole gateway keys off:

* :class:`Provider` — the supported AI providers. Every provider has exactly one
  adapter (see ``ai.providers``); no provider-specific code lives anywhere else.
* :class:`PromptType` — enum-based prompt IDs (PRD §7, "never hardcode prompts in
  services"). The prompt registry (``ai.prompts``) maps each to a template.
* :class:`RequestStatus` — lifecycle of a logged :class:`ai.models.AIRequest`.

All are ``TextChoices`` so they double as model ``choices`` and as the keys used
in the settings-driven ``AI_MODELS`` / ``AI_TOKEN_PRICING`` configuration.
"""
from django.db import models


class Provider(models.TextChoices):
    GROQ = "groq", "Groq"
    OPENAI = "openai", "OpenAI"
    ANTHROPIC = "anthropic", "Anthropic Claude"
    GEMINI = "gemini", "Google Gemini"
    DEEPSEEK = "deepseek", "DeepSeek"
    MOCK = "mock", "Mock (no network)"


class RequestStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    SUCCESS = "success", "Success"
    FAILED = "failed", "Failed"


class PromptType(models.TextChoices):
    QUESTION_GENERATION = "question_generation", "Question Generation"
    QUESTION_IMPROVEMENT = "question_improvement", "Question Improvement"
    QUESTION_EXPLANATION = "question_explanation", "Question Explanation"
    QUESTION_HINT = "question_hint", "Question Hint"
    QUESTION_TRANSLATION = "question_translation", "Question Translation"
    DISTRACTOR_GENERATION = "distractor_generation", "Distractor Generation"
    BLOOM_CLASSIFICATION = "bloom_classification", "Bloom Classification"
    DIFFICULTY_CLASSIFICATION = "difficulty_classification", "Difficulty Classification"
