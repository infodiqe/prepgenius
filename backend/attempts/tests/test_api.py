"""API tests for the attempts app (MockTest, ExamAttempt, UserAnswer)."""
import pytest
from django.urls import reverse
from rest_framework import status

from attempts.models import ExamAttempt, MockTest


# ═══════════════════════════════════════════════════════════════════════
# MOCK TESTS
# ═══════════════════════════════════════════════════════════════════════


class TestMockTestList:
    LIST_URL = reverse("attempts:mock-test-list")

    def test_list_mock_tests_authenticated(
        self, student_api_client, mock_test
    ):
        response = student_api_client.get(self.LIST_URL)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_list_mock_tests_anonymous(self, anonymous_client, mock_test):
        response = anonymous_client.get(self.LIST_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_mock_tests_filter_by_exam(
        self, student_api_client, mock_test, exam_hierarchy
    ):
        response = student_api_client.get(
            self.LIST_URL,
            {"exam_id": exam_hierarchy["exam"].id},
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_create_mock_test_as_content_manager(
        self, content_manager_api_client, exam
    ):
        data = {
            "exam_id": str(exam.id),
            "name": "New Mock Test",
            "type": "system",
            "duration_seconds": 3600,
            "total_questions": 100,
        }
        response = content_manager_api_client.post(
            self.LIST_URL, data, format="json"
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "New Mock Test"

    def test_create_mock_test_as_student_forbidden(
        self, student_api_client, exam
    ):
        data = {
            "exam_id": str(exam.id),
            "name": "Student Mock",
            "type": "system",
            "duration_seconds": 3600,
            "total_questions": 100,
        }
        response = student_api_client.post(self.LIST_URL, data, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestMockTestDetail:
    def test_get_mock_test(self, student_api_client, mock_test):
        url = reverse(
            "attempts:mock-test-detail", kwargs={"pk": mock_test.id}
        )
        response = student_api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert str(response.data["id"]) == str(mock_test.id)

    def test_get_mock_test_not_found(self, student_api_client):
        url = reverse(
            "attempts:mock-test-detail",
            kwargs={"pk": "00000000-0000-0000-0000-000000000000"},
        )
        response = student_api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_patch_mock_test(
        self, content_manager_api_client, mock_test
    ):
        url = reverse(
            "attempts:mock-test-detail", kwargs={"pk": mock_test.id}
        )
        response = content_manager_api_client.patch(
            url, {"name": "Updated Name"}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Updated Name"

    def test_delete_mock_test(
        self, content_manager_api_client, mock_test
    ):
        url = reverse(
            "attempts:mock-test-detail", kwargs={"pk": mock_test.id}
        )
        response = content_manager_api_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not MockTest.objects.filter(id=mock_test.id).exists()


# ═══════════════════════════════════════════════════════════════════════
# MOCK TEST QUESTIONS
# ═══════════════════════════════════════════════════════════════════════


class TestMockTestQuestionList:
    def test_list_questions(
        self, student_api_client, mock_test_with_questions
    ):
        url = reverse(
            "attempts:mock-test-question-list",
            kwargs={"mock_test_pk": mock_test_with_questions.id},
        )
        response = student_api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == mock_test_with_questions.total_questions

    def test_add_question(
        self, content_manager_api_client, mock_test, published_question
    ):
        url = reverse(
            "attempts:mock-test-question-list",
            kwargs={"mock_test_pk": mock_test.id},
        )
        data = {
            "question_id": str(published_question.id),
            "position": 1,
        }
        response = content_manager_api_client.post(
            url, data, format="json"
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_add_duplicate_question(
        self, content_manager_api_client, mock_test_with_questions
    ):
        mtq = mock_test_with_questions.questions.first()
        url = reverse(
            "attempts:mock-test-question-list",
            kwargs={"mock_test_pk": mock_test_with_questions.id},
        )
        data = {
            "question_id": str(mtq.question_id),
            "position": 99,
        }
        response = content_manager_api_client.post(
            url, data, format="json"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ═══════════════════════════════════════════════════════════════════════
# EXAM ATTEMPTS
# ═══════════════════════════════════════════════════════════════════════


class TestAttemptList:
    LIST_URL = reverse("attempts:attempt-list")

    def test_list_attempts_authenticated(
        self, student_api_client, attempt
    ):
        response = student_api_client.get(self.LIST_URL)
        assert response.status_code == status.HTTP_200_OK

    def test_list_attempts_anonymous(self, anonymous_client):
        response = anonymous_client.get(self.LIST_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_attempt(
        self, student_api_client, exam
    ):
        data = {
            "exam_id": str(exam.id),
            "attempt_type": "full_mock",
        }
        response = student_api_client.post(
            self.LIST_URL, data, format="json"
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["status"] == "created"

    def test_create_attempt_with_mock(
        self, student_api_client, exam, mock_test_with_questions
    ):
        data = {
            "exam_id": str(exam.id),
            "attempt_type": "full_mock",
            "mock_test_id": str(mock_test_with_questions.id),
        }
        response = student_api_client.post(
            self.LIST_URL, data, format="json"
        )
        assert response.status_code == status.HTTP_201_CREATED


class TestAttemptStart:
    def test_start_attempt(self, student_api_client, attempt, exam):
        created_attempt = ExamAttempt.objects.create(
            user=attempt.user,
            exam=attempt.exam,
            attempt_type="full_mock",
            status="created",
        )
        url = reverse(
            "attempts:attempt-start",
            kwargs={"pk": created_attempt.id},
        )
        response = student_api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "in_progress"
        assert response.data["started_at"] is not None

    def test_start_already_running_fails(
        self, student_api_client, attempt
    ):
        url = reverse(
            "attempts:attempt-start",
            kwargs={"pk": attempt.id},
        )
        response = student_api_client.post(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestAttemptSubmit:
    def test_submit_attempt(self, student_api_client, attempt):
        url = reverse(
            "attempts:attempt-submit",
            kwargs={"pk": attempt.id},
        )
        response = student_api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        # submit_attempt now auto-scores; final status is "scored".
        assert response.data["status"] == "scored"
        assert response.data["submitted_at"] is not None

    def test_submit_already_submitted_fails(
        self, student_api_client, attempt
    ):
        submit_url = reverse(
            "attempts:attempt-submit",
            kwargs={"pk": attempt.id},
        )
        # First submit succeeds and auto-scores (status → "scored").
        student_api_client.post(submit_url)
        # Second submit on a scored attempt is an invalid transition → 400.
        response = student_api_client.post(submit_url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestAttemptScore:
    """Tests for the admin-only POST /score/ recovery endpoint.

    Normal scoring is now triggered automatically inside submit_attempt().
    This endpoint is a manual fallback for attempts that remain in 'submitted'
    status due to an auto-score failure.
    """

    def _force_submitted(self, attempt):
        """Place the attempt in 'submitted' without triggering auto-score."""
        from django.utils import timezone as tz
        attempt.status = "submitted"
        attempt.submitted_at = tz.now()
        attempt.save(update_fields=["status", "submitted_at"])
        attempt.refresh_from_db()

    def test_admin_can_score_submitted_attempt(
        self, content_manager_api_client, attempt
    ):
        self._force_submitted(attempt)
        score_url = reverse(
            "attempts:attempt-score",
            kwargs={"pk": attempt.id},
        )
        response = content_manager_api_client.post(score_url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "scored"

    def test_student_cannot_call_score_endpoint(
        self, student_api_client, attempt
    ):
        self._force_submitted(attempt)
        score_url = reverse(
            "attempts:attempt-score",
            kwargs={"pk": attempt.id},
        )
        response = student_api_client.post(score_url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_submit_auto_scores_attempt(self, student_api_client, attempt):
        """Submit endpoint now returns status='scored' immediately."""
        submit_url = reverse(
            "attempts:attempt-submit",
            kwargs={"pk": attempt.id},
        )
        response = student_api_client.post(submit_url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "scored"

    def test_score_already_scored_attempt_returns_400(
        self, content_manager_api_client, student_api_client, attempt
    ):
        """Calling /score/ on an already-scored attempt is an invalid transition."""
        submit_url = reverse(
            "attempts:attempt-submit",
            kwargs={"pk": attempt.id},
        )
        student_api_client.post(submit_url)  # auto-scores → "scored"

        score_url = reverse(
            "attempts:attempt-score",
            kwargs={"pk": attempt.id},
        )
        response = content_manager_api_client.post(score_url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ═══════════════════════════════════════════════════════════════════════
# USER ANSWERS
# ═══════════════════════════════════════════════════════════════════════


class TestUserAnswerSave:
    def test_save_answer(
        self, student_api_client, attempt, published_question
    ):
        url = reverse(
            "attempts:answer-save",
            kwargs={"attempt_pk": attempt.id},
        )
        data = {
            "question_id": str(published_question.id),
            "state": "answered",
            "time_spent_seconds": 30,
        }
        response = student_api_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["state"] == "answered"

    def test_save_answer_idempotent(
        self, student_api_client, attempt, published_question
    ):
        url = reverse(
            "attempts:answer-save",
            kwargs={"attempt_pk": attempt.id},
        )
        data = {
            "question_id": str(published_question.id),
            "state": "answered",
        }
        student_api_client.post(url, data, format="json")
        response = student_api_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK

    def test_save_answer_to_submitted_attempt_fails(
        self, student_api_client, attempt, published_question
    ):
        submit_url = reverse(
            "attempts:attempt-submit",
            kwargs={"pk": attempt.id},
        )
        student_api_client.post(submit_url)

        url = reverse(
            "attempts:answer-save",
            kwargs={"attempt_pk": attempt.id},
        )
        data = {
            "question_id": str(published_question.id),
            "state": "answered",
        }
        response = student_api_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestUserAnswerList:
    def test_list_answers(
        self, student_api_client, attempt, published_question
    ):
        from attempts.models import UserAnswer

        UserAnswer.objects.create(
            attempt=attempt,
            question=published_question,
            state="answered",
        )
        url = reverse(
            "attempts:answer-list",
            kwargs={"attempt_pk": attempt.id},
        )
        response = student_api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1


class TestUserAnswerBulkSave:
    def test_bulk_save(
        self, student_api_client, attempt, published_question
    ):
        url = reverse(
            "attempts:answer-bulk-save",
            kwargs={"attempt_pk": attempt.id},
        )
        data = {
            "answers": [
                {
                    "question_id": str(published_question.id),
                    "state": "answered",
                    "time_spent_seconds": 15,
                }
            ]
        }
        response = student_api_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1


class TestInProgressAnswerDoesNotLeakCorrectness:
    """PH-7.1 regression: student-facing in-progress answer APIs must never
    expose ``is_correct``, which would let the mock player infer the right
    answer mid-attempt. Correctness is only revealed after scoring."""

    def test_save_answer_response_omits_is_correct(
        self, student_api_client, attempt, published_question
    ):
        url = reverse(
            "attempts:answer-save",
            kwargs={"attempt_pk": attempt.id},
        )
        data = {
            "question_id": str(published_question.id),
            "state": "answered",
            "time_spent_seconds": 10,
        }
        response = student_api_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert "is_correct" not in response.data

    def test_bulk_save_response_omits_is_correct(
        self, student_api_client, attempt, published_question
    ):
        url = reverse(
            "attempts:answer-bulk-save",
            kwargs={"attempt_pk": attempt.id},
        )
        data = {
            "answers": [
                {
                    "question_id": str(published_question.id),
                    "state": "answered",
                }
            ]
        }
        response = student_api_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert all("is_correct" not in item for item in response.data)

    def test_list_answers_response_omits_is_correct(
        self, student_api_client, attempt, published_question
    ):
        from attempts.models import UserAnswer

        UserAnswer.objects.create(
            attempt=attempt,
            question=published_question,
            state="answered",
        )
        url = reverse(
            "attempts:answer-list",
            kwargs={"attempt_pk": attempt.id},
        )
        response = student_api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
        assert all("is_correct" not in item for item in response.data)


class TestScoredResultsStillExposeCorrectness:
    """PH-7.1 guard rail: removing is_correct from in-progress responses must
    NOT regress the scored-results payload, which legitimately exposes it."""

    def test_scored_attempt_answers_include_is_correct(
        self, student_api_client, attempt, question_with_options
    ):
        from attempts.models import UserAnswer

        question, options = question_with_options
        UserAnswer.objects.create(
            attempt=attempt,
            question=question,
            selected_option=options[0],
            state="answered",
        )

        submit_url = reverse(
            "attempts:attempt-submit",
            kwargs={"pk": attempt.id},
        )
        submit_response = student_api_client.post(submit_url)
        assert submit_response.status_code == status.HTTP_200_OK
        assert submit_response.data["status"] == "scored"

        # The scored-attempt detail endpoint returns ScoredAttemptDetailSerializer,
        # whose nested answers legitimately expose is_correct post-scoring.
        detail_url = reverse(
            "attempts:attempt-detail",
            kwargs={"pk": attempt.id},
        )
        response = student_api_client.get(detail_url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "scored"
        assert len(response.data["answers"]) >= 1
        assert all("is_correct" in item for item in response.data["answers"])

    def test_in_progress_attempt_detail_hides_is_correct(
        self, student_api_client, attempt, question_with_options
    ):
        """P0-1 regression: GET /attempts/{id}/ on an in-progress attempt must
        NOT expose answers[].is_correct (the attempt-detail leak missed by
        PH-7.1)."""
        from attempts.models import UserAnswer

        question, options = question_with_options
        UserAnswer.objects.create(
            attempt=attempt,
            question=question,
            selected_option=options[0],
            state="answered",
            is_correct=True,
        )

        detail_url = reverse(
            "attempts:attempt-detail",
            kwargs={"pk": attempt.id},
        )
        response = student_api_client.get(detail_url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "in_progress"
        assert len(response.data["answers"]) >= 1
        assert all("is_correct" not in item for item in response.data["answers"])
