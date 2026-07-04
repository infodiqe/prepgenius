"""
Review prompt registry + action mapping (Sprint-6B-04, Tasks 1 & 2)."""
import pytest

from ai.prompts import render_prompt
from ai.review.enums import ACTION_TO_PROMPT, ReviewAction, action_catalog, prompt_type_for


def test_every_action_maps_to_a_registered_prompt():
    from ai.prompts import PROMPT_REGISTRY

    assert set(ACTION_TO_PROMPT) == {a.value for a in ReviewAction}
    for action in ReviewAction:
        assert prompt_type_for(action.value) in PROMPT_REGISTRY


def test_action_catalog_covers_all_actions():
    values = {row["value"] for row in action_catalog()}
    assert values == {a.value for a in ReviewAction}


def test_review_prompt_renders_with_question_payload():
    payload = {
        "exam": "CTET",
        "subject": "Maths",
        "topic": "Fractions",
        "subtopic": "Addition",
        "difficulty": "medium",
        "bloom_level": "apply",
        "language": "en",
        "stem": "What is one half plus one half?",
        "options_block": "A) zero\nB) one [correct]\nC) two\nD) three",
        "correct_answer": "B",
        "explanation": "Halves combine to a whole.",
        "learning_objective": "Add like fractions.",
        "reviewer_instructions": "make it harder",
    }
    rendered = render_prompt(prompt_type_for(ReviewAction.INCREASE_DIFFICULTY.value), payload)
    assert "one half plus one half" in rendered.user
    assert "make it harder" in rendered.user
    # System prompt is the shared review-editor system message (never a rewrite of it).
    assert "editor" in rendered.system.lower()


def test_review_prompt_never_emits_literal_none_for_absent_optionals():
    # Missing optional placeholders render empty, not "None".
    rendered = render_prompt(
        prompt_type_for(ReviewAction.REWRITE_STEM.value),
        {"stem": "A stem"},
    )
    assert "None" not in rendered.user
