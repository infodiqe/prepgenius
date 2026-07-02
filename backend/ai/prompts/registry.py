"""
Centralized prompt registry (Sprint-6A-01).

Every prompt the gateway can run is declared here, keyed by :class:`PromptType`.
Services NEVER hardcode prompt strings — they call :func:`render_prompt` with a
prompt type and an input payload (PRD §7). This keeps prompt engineering in one
auditable place and lets later sprints (6B/6C/6D) refine the wording without
touching business logic.

A :class:`PromptTemplate` is intentionally simple: a static ``system`` message
plus a ``template`` string rendered with ``str.format`` against the payload.
``required_vars`` are validated before rendering so a missing input fails fast
with a clear :class:`PromptRenderError` rather than producing a malformed prompt.

The concrete wording below is deliberately generic scaffolding for the AI
Foundation sprint; feature sprints own the final prompt copy.
"""
from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

from ai.enums import PromptType
from ai.exceptions import PromptNotRegisteredError, PromptRenderError


@dataclass(frozen=True)
class RenderedPrompt:
    """A fully-rendered prompt ready to hand to a provider adapter."""

    system: str
    user: str


@dataclass(frozen=True)
class PromptTemplate:
    """
    A registered prompt. ``template`` is a ``str.format`` string; ``required_vars``
    must all be present (and non-empty) in the payload for rendering to succeed.
    """

    prompt_type: PromptType
    system: str
    template: str
    required_vars: tuple[str, ...] = ()

    def render(self, payload: Mapping[str, Any]) -> RenderedPrompt:
        missing = [
            var
            for var in self.required_vars
            if payload.get(var) in (None, "")
        ]
        if missing:
            raise PromptRenderError(
                f"Prompt '{self.prompt_type}' is missing required "
                f"input(s): {', '.join(sorted(missing))}."
            )
        try:
            user = self.template.format_map(_SafeDict(payload))
        except (IndexError, ValueError) as exc:  # malformed template/placeholder
            raise PromptRenderError(
                f"Prompt '{self.prompt_type}' could not be rendered: {exc}"
            ) from exc
        return RenderedPrompt(system=self.system, user=user)


class _SafeDict(dict):
    """
    ``str.format_map`` helper: leaves unknown ``{placeholders}`` untouched instead
    of raising ``KeyError``. Required vars are validated separately; optional ones
    that the caller omits simply render as an empty string.
    """

    def __missing__(self, key: str) -> str:
        return ""


PROMPT_REGISTRY: dict[PromptType, PromptTemplate] = {
    PromptType.QUESTION_GENERATION: PromptTemplate(
        prompt_type=PromptType.QUESTION_GENERATION,
        system=(
            "You are an expert competitive-exam question setter. Produce accurate, "
            "syllabus-aligned questions with a single, unambiguous best answer. "
            "Exactly one option is correct; the distractors are plausible but "
            "clearly wrong. Always include a concise explanation of why the "
            "correct answer is correct. "
            "CRITICAL OUTPUT RULES: respond with valid JSON ONLY. No markdown, no "
            "code fences, no HTML, no commentary before or after the JSON."
        ),
        # NOTE: this template contains NO literal braces — the JSON schema is
        # described in prose so str.format rendering stays safe. Only the named
        # placeholders below are substituted. The generation service always
        # supplies the full payload (subtopic/instructions default to empty).
        template=(
            "Generate {count} '{question_type}' question(s) in {language} for:\n"
            "- Exam: {exam}\n"
            "- Subject: {subject}\n"
            "- Topic: {topic}\n"
            "- Subtopic: {subtopic}\n"
            "- Difficulty: {difficulty}\n"
            "- Bloom level: {bloom_level}\n"
            "- Additional instructions: {additional_instructions}\n\n"
            "Respond with a single JSON object having one key named \"questions\" "
            "whose value is an array of question objects. Each question object "
            "must contain these keys: \"stem\" (string), \"options\" (array of "
            "objects, each with \"label\" such as A/B/C/D, \"text\" string, and "
            "\"is_correct\" boolean), \"correct_answer\" (the label of the single "
            "correct option), \"explanation\" (string), \"difficulty\" (string), "
            "\"bloom_level\" (string), \"estimated_time_seconds\" (integer), "
            "\"tags\" (array of strings), \"learning_objective\" (string), "
            "\"language\" (string), and \"confidence_score\" (number between 0 and "
            "1). Exactly one option must have is_correct true. Do not include any "
            "text outside the JSON object."
        ),
        required_vars=("exam", "subject", "topic"),
    ),
    PromptType.QUESTION_IMPROVEMENT: PromptTemplate(
        prompt_type=PromptType.QUESTION_IMPROVEMENT,
        system=(
            "You are an editor improving competitive-exam questions for clarity, "
            "correctness, and single-best-answer quality without changing intent."
        ),
        template="Improve the following question:\n{question}",
        required_vars=("question",),
    ),
    PromptType.QUESTION_EXPLANATION: PromptTemplate(
        prompt_type=PromptType.QUESTION_EXPLANATION,
        system=(
            "You are a patient tutor. Explain why the correct answer is correct in "
            "clear, concise language a learner can follow."
        ),
        template=(
            "Explain the answer to this question:\n{question}\n"
            "Correct answer: {answer}"
        ),
        required_vars=("question",),
    ),
    PromptType.QUESTION_HINT: PromptTemplate(
        prompt_type=PromptType.QUESTION_HINT,
        system=(
            "You are a tutor giving a single nudge. Provide a hint that guides the "
            "learner toward the answer without revealing it."
        ),
        template="Give one hint for this question without revealing the answer:\n{question}",
        required_vars=("question",),
    ),
    PromptType.QUESTION_TRANSLATION: PromptTemplate(
        prompt_type=PromptType.QUESTION_TRANSLATION,
        system=(
            "You are a precise translator for educational content. Preserve meaning, "
            "terminology, and formatting exactly."
        ),
        template="Translate the following content into {target_language}:\n{content}",
        required_vars=("content", "target_language"),
    ),
    PromptType.DISTRACTOR_GENERATION: PromptTemplate(
        prompt_type=PromptType.DISTRACTOR_GENERATION,
        system=(
            "You generate plausible but incorrect multiple-choice distractors that "
            "reflect common misconceptions, never a second correct answer."
        ),
        template=(
            "Generate plausible distractors for this question:\n{question}\n"
            "Correct answer: {answer}"
        ),
        required_vars=("question", "answer"),
    ),
    PromptType.BLOOM_CLASSIFICATION: PromptTemplate(
        prompt_type=PromptType.BLOOM_CLASSIFICATION,
        system=(
            "You classify questions by Bloom's taxonomy level (remember, understand, "
            "apply, analyze, evaluate, create). Respond with the single best level."
        ),
        template="Classify the Bloom's taxonomy level of this question:\n{question}",
        required_vars=("question",),
    ),
    PromptType.DIFFICULTY_CLASSIFICATION: PromptTemplate(
        prompt_type=PromptType.DIFFICULTY_CLASSIFICATION,
        system=(
            "You classify exam questions by difficulty (easy, medium, hard) for the "
            "target audience. Respond with the single best level."
        ),
        template="Classify the difficulty of this question:\n{question}",
        required_vars=("question",),
    ),
}


def get_prompt(prompt_type: PromptType | str) -> PromptTemplate:
    """Return the registered template for ``prompt_type`` or raise."""
    try:
        key = PromptType(prompt_type)
    except ValueError as exc:
        raise PromptNotRegisteredError(f"Unknown prompt type: {prompt_type!r}") from exc
    try:
        return PROMPT_REGISTRY[key]
    except KeyError as exc:  # pragma: no cover - guarded by parity test
        raise PromptNotRegisteredError(
            f"Prompt type '{key}' is not registered."
        ) from exc


def render_prompt(prompt_type: PromptType | str, payload: Mapping[str, Any]) -> RenderedPrompt:
    """Render the template for ``prompt_type`` against ``payload``."""
    return get_prompt(prompt_type).render(payload)
