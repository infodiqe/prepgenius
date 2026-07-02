from decimal import Decimal

import factory
from factory.django import DjangoModelFactory

from ai.enums import PromptType, Provider, RequestStatus
from ai.models import AIQuestionDraft, AIRequest, DraftStatus


class AIRequestFactory(DjangoModelFactory):
    class Meta:
        model = AIRequest
        skip_postgeneration_save = True

    provider = Provider.MOCK.value
    model = "mock-model"
    prompt_type = PromptType.QUESTION_EXPLANATION.value
    input = factory.LazyFunction(dict)
    output = "answer"
    status = RequestStatus.SUCCESS.value
    latency_ms = 10
    prompt_tokens = 5
    completion_tokens = 7
    total_tokens = 12
    cost = Decimal("0.000000")
    attempts = 1
    error = ""


class AIQuestionDraftFactory(DjangoModelFactory):
    class Meta:
        model = AIQuestionDraft
        skip_postgeneration_save = True

    exam = "CTET"
    subject = "Mathematics"
    topic = "Fractions"
    subtopic = None
    question_type = "single_correct"
    difficulty = "medium"
    bloom_level = "apply"
    language = "en"
    stem = "What is 2 + 2?"
    options = factory.LazyFunction(
        lambda: [
            {"label": "A", "text": "3", "is_correct": False},
            {"label": "B", "text": "4", "is_correct": True},
            {"label": "C", "text": "5", "is_correct": False},
            {"label": "D", "text": "6", "is_correct": False},
        ]
    )
    correct_answer = "B"
    explanation = "Two plus two equals four."
    learning_objective = "Add small integers."
    estimated_time = 30
    tags = factory.LazyFunction(lambda: ["arithmetic"])
    confidence = 0.9
    generation_prompt = "system\n\nuser"
    provider = Provider.MOCK.value
    model = "mock-model"
    validation_report = factory.LazyFunction(lambda: {"valid": True, "errors": [], "warnings": []})
    status = DraftStatus.GENERATED
