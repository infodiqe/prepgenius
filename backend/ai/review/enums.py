"""
Review-action catalog (Sprint-6B-04, Task 1).

The AI-assisted review actions a reviewer can apply to an existing draft, and the
:class:`ai.enums.PromptType` each maps to (Task 1 — "every action maps to a
PromptType"). The prompt text itself lives only in the prompt registry; this module
holds the action → prompt-type wiring, never prompt strings.
"""
from __future__ import annotations

from django.db import models

from ai.enums import PromptType


class ReviewAction(models.TextChoices):
    IMPROVE_EXPLANATION = "improve_explanation", "Improve Explanation"
    IMPROVE_DISTRACTORS = "improve_distractors", "Improve Distractors"
    REDUCE_AMBIGUITY = "reduce_ambiguity", "Reduce Ambiguity"
    INCREASE_DIFFICULTY = "increase_difficulty", "Increase Difficulty"
    REDUCE_DIFFICULTY = "reduce_difficulty", "Reduce Difficulty"
    IMPROVE_BLOOM = "improve_bloom", "Improve Bloom Level"
    REWRITE_STEM = "rewrite_stem", "Rewrite Stem"
    ADD_SCENARIO = "add_scenario", "Add Scenario"
    SIMPLIFY_LANGUAGE = "simplify_language", "Simplify Language"
    IMPROVE_LEARNING_OBJECTIVE = "improve_learning_objective", "Improve Learning Objective"


#: Review action → prompt type (Task 1). Each prompt is registered in the registry.
ACTION_TO_PROMPT: dict[str, PromptType] = {
    ReviewAction.IMPROVE_EXPLANATION.value: PromptType.REVIEW_IMPROVE_EXPLANATION,
    ReviewAction.IMPROVE_DISTRACTORS.value: PromptType.REVIEW_IMPROVE_DISTRACTORS,
    ReviewAction.REDUCE_AMBIGUITY.value: PromptType.REVIEW_REDUCE_AMBIGUITY,
    ReviewAction.INCREASE_DIFFICULTY.value: PromptType.REVIEW_INCREASE_DIFFICULTY,
    ReviewAction.REDUCE_DIFFICULTY.value: PromptType.REVIEW_REDUCE_DIFFICULTY,
    ReviewAction.IMPROVE_BLOOM.value: PromptType.REVIEW_IMPROVE_BLOOM,
    ReviewAction.REWRITE_STEM.value: PromptType.REVIEW_REWRITE_STEM,
    ReviewAction.ADD_SCENARIO.value: PromptType.REVIEW_ADD_SCENARIO,
    ReviewAction.SIMPLIFY_LANGUAGE.value: PromptType.REVIEW_SIMPLIFY_LANGUAGE,
    ReviewAction.IMPROVE_LEARNING_OBJECTIVE.value: PromptType.REVIEW_IMPROVE_LEARNING_OBJECTIVE,
}


def prompt_type_for(action: str) -> PromptType:
    """Resolve the prompt type for a review action value (raises on unknown)."""
    return ACTION_TO_PROMPT[ReviewAction(action).value]


def action_catalog() -> list[dict[str, str]]:
    """The action selector catalog for the workspace (value + human label)."""
    return [{"value": a.value, "label": a.label} for a in ReviewAction]
