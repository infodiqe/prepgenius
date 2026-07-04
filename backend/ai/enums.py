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
    # ── AI Content Review Assistant actions (Sprint-6B-04) ───────────────────
    # One prompt type per review action. Each renders the current question + the
    # action directive and returns an improved question in the canonical schema.
    REVIEW_IMPROVE_EXPLANATION = "review_improve_explanation", "Review: Improve Explanation"
    REVIEW_IMPROVE_DISTRACTORS = "review_improve_distractors", "Review: Improve Distractors"
    REVIEW_REDUCE_AMBIGUITY = "review_reduce_ambiguity", "Review: Reduce Ambiguity"
    REVIEW_INCREASE_DIFFICULTY = "review_increase_difficulty", "Review: Increase Difficulty"
    REVIEW_REDUCE_DIFFICULTY = "review_reduce_difficulty", "Review: Reduce Difficulty"
    REVIEW_IMPROVE_BLOOM = "review_improve_bloom", "Review: Improve Bloom Level"
    REVIEW_REWRITE_STEM = "review_rewrite_stem", "Review: Rewrite Stem"
    REVIEW_ADD_SCENARIO = "review_add_scenario", "Review: Add Scenario"
    REVIEW_SIMPLIFY_LANGUAGE = "review_simplify_language", "Review: Simplify Language"
    REVIEW_IMPROVE_LEARNING_OBJECTIVE = (
        "review_improve_learning_objective",
        "Review: Improve Learning Objective",
    )
