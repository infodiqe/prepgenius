"""PH-7.2 regression: student-facing question/option payloads must never expose
answer keys (option.is_correct, the correct-option marker, or the explanation /
rationale), while content-authoring roles keep the full payload unchanged.

The "after scoring, correctness is still available" half of the acceptance
criteria is covered by attempts/tests/test_api.py::TestScoredResultsStillExposeCorrectness
(per-answer is_correct via the scored-attempt detail), which this change does not
touch.
"""
import pytest

from .factories import QuestionOptionFactory

pytestmark = pytest.mark.django_db


# Fields that would let a student infer the answer from a question payload.
_QUESTION_LEAK_FIELDS = {"explanation"}
_OPTION_LEAK_FIELDS = {"is_correct"}


@pytest.fixture
def published_question_with_options(published_question):
    options = [
        QuestionOptionFactory(
            question=published_question,
            label=label,
            body=body,
            is_correct=correct,
            position=i + 1,
        )
        for i, (label, body, correct) in enumerate(
            [
                ("A", "Correct answer", True),
                ("B", "Wrong answer 1", False),
                ("C", "Wrong answer 2", False),
                ("D", "Wrong answer 3", False),
            ]
        )
    ]
    return published_question, options


def _assert_question_is_student_safe(question_payload):
    for field in _QUESTION_LEAK_FIELDS:
        assert field not in question_payload, f"leaked question field: {field}"
    for option in question_payload.get("options", []):
        for field in _OPTION_LEAK_FIELDS:
            assert field not in option, f"leaked option field: {field}"


# ── Learner (published) endpoints ─────────────────────────────────────────


class TestLearnerQuestionEndpointsHideAnswerKeys:
    def test_published_list_hides_answer_keys(
        self, student_api_client, published_question_with_options
    ):
        response = student_api_client.get("/api/v1/questions/published/")
        assert response.status_code == 200
        assert len(response.data) >= 1
        for question_payload in response.data:
            _assert_question_is_student_safe(question_payload)

    def test_published_detail_hides_answer_keys(
        self, student_api_client, published_question_with_options
    ):
        question, _ = published_question_with_options
        response = student_api_client.get(
            f"/api/v1/questions/published/{question.id}/"
        )
        assert response.status_code == 200
        assert response.data["options"]  # options are present...
        _assert_question_is_student_safe(response.data)  # ...but answer-key-free

    def test_published_by_subtopic_hides_answer_keys(
        self, student_api_client, published_question_with_options, subtopic
    ):
        response = student_api_client.get(
            f"/api/v1/questions/published/by-subtopic/{subtopic.id}/"
        )
        assert response.status_code == 200
        for question_payload in response.data:
            _assert_question_is_student_safe(question_payload)


# ── Shared content endpoints reachable by students (IsAuthenticatedReadOnly) ─


class TestContentEndpointsHideAnswerKeysFromStudents:
    def test_question_detail_hides_answer_keys_from_student(
        self, student_api_client, question_with_options
    ):
        question, _ = question_with_options
        response = student_api_client.get(f"/api/v1/questions/{question.id}/")
        assert response.status_code == 200
        _assert_question_is_student_safe(response.data)

    def test_question_list_hides_answer_keys_from_student(
        self, student_api_client, question_with_options
    ):
        response = student_api_client.get("/api/v1/questions/")
        assert response.status_code == 200
        for question_payload in response.data:
            _assert_question_is_student_safe(question_payload)

    def test_option_list_hides_marker_from_student(
        self, student_api_client, question_with_options
    ):
        question, _ = question_with_options
        response = student_api_client.get(
            f"/api/v1/questions/{question.id}/options/"
        )
        assert response.status_code == 200
        assert len(response.data) == 4
        for option in response.data:
            assert "is_correct" not in option

    def test_option_detail_hides_marker_from_student(
        self, student_api_client, question_with_options
    ):
        _, options = question_with_options
        response = student_api_client.get(f"/api/v1/options/{options[0].id}/")
        assert response.status_code == 200
        assert "is_correct" not in response.data


# ── Content-authoring roles must still see everything (req 2: unchanged) ────


class TestContentAuthorsStillSeeAnswerKeys:
    def test_question_detail_exposes_answer_keys_to_content_manager(
        self, content_manager_api_client, question_with_options
    ):
        question, _ = question_with_options
        response = content_manager_api_client.get(
            f"/api/v1/questions/{question.id}/"
        )
        assert response.status_code == 200
        assert "explanation" in response.data
        assert any(o["is_correct"] for o in response.data["options"])

    def test_option_detail_exposes_marker_to_content_manager(
        self, content_manager_api_client, question_with_options
    ):
        _, options = question_with_options
        response = content_manager_api_client.get(
            f"/api/v1/options/{options[0].id}/"
        )
        assert response.status_code == 200
        assert "is_correct" in response.data

    def test_reviewer_and_sme_also_see_answer_keys(
        self, content_reviewer_api_client, sme_api_client, question_with_options
    ):
        question, _ = question_with_options
        for client in (content_reviewer_api_client, sme_api_client):
            response = client.get(f"/api/v1/questions/{question.id}/")
            assert response.status_code == 200
            assert "explanation" in response.data
            assert any(o["is_correct"] for o in response.data["options"])
