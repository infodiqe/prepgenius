"""T28 — practice attempt API: endpoint, ownership/security, regression."""
import pytest
from django.urls import reverse
from rest_framework import status

from attempts.models import ExamAttempt, MockTest

from .factories import (
    ExamFactory,
    PublishedQuestionFactory,
    QuestionOptionFactory,
    SubjectFactory,
    SubtopicFactory,
    TopicFactory,
)

PRACTICE_URL = reverse("attempts:practice-attempt-create")


@pytest.fixture
def practice_content():
    """Exam with one subject/topic/subtopic and 3 published questions."""
    exam = ExamFactory(code="APIPRX", name="API Practice", exam_type="qualifying")
    subject = SubjectFactory(exam=exam, name="Science", position=1)
    topic = TopicFactory(subject=subject, name="Physics", position=1)
    subtopic = SubtopicFactory(topic=topic, name="Motion", position=1)
    for _ in range(3):
        q = PublishedQuestionFactory(exam=exam, subtopic=subtopic, stem="Q")
        for i, label in enumerate(["A", "B", "C", "D"]):
            QuestionOptionFactory(
                question=q,
                label=label,
                body=label,
                is_correct=(label == "A"),
                position=i + 1,
            )
    return {"exam": exam, "subject": subject, "topic": topic}


class TestPracticeApi:
    def test_create_topic_practice_returns_201(
        self, student_api_client, practice_content
    ):
        resp = student_api_client.post(
            PRACTICE_URL,
            {
                "exam_id": str(practice_content["exam"].id),
                "scope_type": "topic",
                "scope_id": str(practice_content["topic"].id),
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["attempt_type"] == "topic"
        assert resp.data["mock_test_id"] is not None
        assert resp.data["status"] == "created"

    def test_create_mixed_practice_returns_201(
        self, student_api_client, practice_content
    ):
        resp = student_api_client.post(
            PRACTICE_URL,
            {"exam_id": str(practice_content["exam"].id), "scope_type": "mixed"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["attempt_type"] == "mixed"

    def test_attempt_and_mock_test_are_owned_by_requesting_user(
        self, student_api_client, practice_content
    ):
        resp = student_api_client.post(
            PRACTICE_URL,
            {
                "exam_id": str(practice_content["exam"].id),
                "scope_type": "subject",
                "scope_id": str(practice_content["subject"].id),
            },
            format="json",
        )
        attempt = ExamAttempt.objects.get(id=resp.data["id"])
        assert attempt.user_id == student_api_client.user.id
        mock_test = MockTest.objects.get(id=attempt.mock_test_id)
        assert mock_test.config["source"] == "practice"
        assert mock_test.config["generated_for_user"] == str(
            student_api_client.user.id
        )

    def test_anonymous_cannot_create_practice(
        self, anonymous_client, practice_content
    ):
        resp = anonymous_client.post(
            PRACTICE_URL,
            {"exam_id": str(practice_content["exam"].id), "scope_type": "mixed"},
            format="json",
        )
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_no_published_questions_returns_400(
        self, student_api_client, practice_content
    ):
        empty_topic = TopicFactory(
            subject=practice_content["subject"], name="Empty", position=9
        )
        SubtopicFactory(topic=empty_topic, name="EmptySub", position=1)
        resp = student_api_client.post(
            PRACTICE_URL,
            {
                "exam_id": str(practice_content["exam"].id),
                "scope_type": "topic",
                "scope_id": str(empty_topic.id),
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_scope_type_returns_400(
        self, student_api_client, practice_content
    ):
        resp = student_api_client.post(
            PRACTICE_URL,
            {"exam_id": str(practice_content["exam"].id), "scope_type": "daily"},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


class TestMockFlowRegression:
    """The existing full_mock / previous_year create path must be unaffected."""

    def test_full_mock_create_via_existing_endpoint_unchanged(
        self, student_api_client, exam, mock_test_with_questions
    ):
        url = reverse("attempts:attempt-list")
        resp = student_api_client.post(
            url,
            {
                "exam_id": str(exam.id),
                "attempt_type": "full_mock",
                "mock_test_id": str(mock_test_with_questions.id),
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        attempt = ExamAttempt.objects.get(id=resp.data["id"])
        assert attempt.mock_test_id == mock_test_with_questions.id
        # The pre-existing mock test is not a generated practice mock test.
        assert mock_test_with_questions.config.get("source") != "practice"
