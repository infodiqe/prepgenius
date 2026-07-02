"""Service layer tests for the attempts app."""
from decimal import Decimal
from datetime import timedelta

import pytest
from django.db import transaction
from django.utils import timezone

from attempts.exceptions import (
    AttemptAlreadySubmittedError,
    InvalidAttemptTransitionError,
    MockTestNotFoundError,
    MockTestNotPublishedError,
    MockTestQuestionNotUniqueError,
)
from attempts.models import ExamAttempt, MockTest, MockTestQuestion, UserAnswer
from attempts.services.attempt_services import (
    add_question_to_mock_test,
    create_attempt,
    create_mock_test,
    delete_mock_test,
    remove_question_from_mock_test,
    save_answer,
    score_attempt,
    start_attempt,
    submit_expired_attempts,
    submit_attempt,
    update_mock_test,
)
from exams.exceptions import ExamNotFoundError
from questions.exceptions import QuestionNotFoundError

from .factories import (
    PublishedQuestionFactory,
    QuestionOptionFactory,
)


class TestCreateMockTest:
    def test_creates_mock_test(self, exam):
        mt = create_mock_test(
            exam_id=exam.id,
            name="CTET Full Mock",
            type="system",
            duration_seconds=7200,
            total_questions=150,
        )
        assert mt.name == "CTET Full Mock"
        assert mt.exam_id == exam.id
        assert mt.type == "system"

    def test_raises_error_for_missing_exam(self):
        with pytest.raises(ExamNotFoundError):
            create_mock_test(
                exam_id="00000000-0000-0000-0000-000000000000",
                name="Bad Mock",
                type="system",
                duration_seconds=3600,
                total_questions=50,
            )


class TestUpdateMockTest:
    def test_updates_name(self, mock_test):
        updated = update_mock_test(
            mock_test_id=mock_test.id, name="Updated Name"
        )
        assert updated.name == "Updated Name"

    def test_publishes_mock_test(self, mock_test):
        updated = update_mock_test(
            mock_test_id=mock_test.id, is_published=False
        )
        assert not updated.is_published


class TestDeleteMockTest:
    def test_deletes_mock_test(self, mock_test):
        delete_mock_test(mock_test_id=mock_test.id)
        assert not MockTest.objects.filter(id=mock_test.id).exists()

    def test_raises_error_for_missing(self):
        with pytest.raises(MockTestNotFoundError):
            delete_mock_test(
                mock_test_id="00000000-0000-0000-0000-000000000000"
            )


class TestAddQuestionToMockTest:
    def test_adds_question(self, mock_test, published_question):
        mtq = add_question_to_mock_test(
            mock_test_id=mock_test.id,
            question_id=published_question.id,
            position=1,
        )
        assert mtq.mock_test_id == mock_test.id
        assert mtq.question_id == published_question.id

    def test_raises_error_for_duplicate(
        self, mock_test, published_question
    ):
        add_question_to_mock_test(
            mock_test_id=mock_test.id,
            question_id=published_question.id,
            position=1,
        )
        with pytest.raises(MockTestQuestionNotUniqueError):
            add_question_to_mock_test(
                mock_test_id=mock_test.id,
                question_id=published_question.id,
                position=2,
            )


class TestCreateAttempt:
    def test_creates_attempt(self, exam, user):
        attempt = create_attempt(
            user_id=user.id,
            exam_id=exam.id,
            attempt_type="full_mock",
        )
        assert attempt.status == "created"
        assert attempt.user_id == user.id
        assert attempt.exam_id == exam.id


class TestStartAttempt:
    def test_starts_attempt(self, exam, user):
        attempt = create_attempt(
            user_id=user.id,
            exam_id=exam.id,
            attempt_type="full_mock",
        )
        started = start_attempt(attempt_id=attempt.id)
        assert started.status == "in_progress"
        assert started.started_at is not None

    def test_rejects_already_in_progress(self, attempt):
        with pytest.raises(InvalidAttemptTransitionError):
            start_attempt(attempt_id=attempt.id)


class TestSubmitAttempt:
    def test_submits_attempt(self, exam, user):
        attempt = create_attempt(
            user_id=user.id,
            exam_id=exam.id,
            attempt_type="full_mock",
        )
        start_attempt(attempt_id=attempt.id)
        result = submit_attempt(attempt_id=attempt.id)
        # submit_attempt now auto-scores, so the final status is "scored".
        assert result.status == "scored"
        assert result.submitted_at is not None

    def test_submitted_sets_time_taken(self, exam, user):
        attempt = create_attempt(
            user_id=user.id,
            exam_id=exam.id,
            attempt_type="full_mock",
        )
        start_attempt(attempt_id=attempt.id)
        result = submit_attempt(attempt_id=attempt.id)
        assert result.time_taken_seconds is not None


def _force_submitted(attempt) -> None:
    """Set attempt to 'submitted' directly in the DB, bypassing submit_attempt().

    submit_attempt() now auto-scores, so tests that need to call score_attempt()
    separately must use this helper to place the attempt in the 'submitted' state
    without triggering auto-scoring.
    """
    from django.utils import timezone as tz

    attempt.status = "submitted"
    attempt.submitted_at = tz.now()
    attempt.save(update_fields=["status", "submitted_at"])
    attempt.refresh_from_db()


class TestScoreAttempt:
    def test_scores_attempt(self, attempt):
        _force_submitted(attempt)
        scored = score_attempt(attempt_id=attempt.id)
        assert scored.status == "scored"

    def test_scores_answer_counts(
        self, attempt, published_question
    ):
        save_answer(
            attempt_id=attempt.id,
            question_id=published_question.id,
            state="answered",
        )
        _force_submitted(attempt)
        scored = score_attempt(attempt_id=attempt.id)
        assert scored.correct >= 0

    def test_scores_using_exam_rules_negative_marking(
        self, exam, user, published_question
    ):
        exam.exam_rules = {
            "marks_per_question": 2,
            "negative_marking": {"enabled": True, "marks": 0.5},
            "total_marks": 2,
        }
        exam.save(update_fields=["exam_rules"])
        attempt = create_attempt(
            user_id=user.id,
            exam_id=exam.id,
            attempt_type="topic",
            duration_seconds=600,
        )
        start_attempt(attempt_id=attempt.id)
        wrong = QuestionOptionFactory(
            question=published_question, is_correct=False
        )
        save_answer(
            attempt_id=attempt.id,
            question_id=published_question.id,
            selected_option_id=wrong.id,
            state="answered",
        )
        _force_submitted(attempt)

        scored = score_attempt(attempt_id=attempt.id)

        assert scored.score == Decimal("-0.50")
        assert scored.max_score == Decimal("2.00")

    def test_scores_without_negative_marking_when_config_disabled(
        self, exam, user, published_question
    ):
        exam.exam_rules = {
            "marks_per_question": 2,
            "negative_marking": False,
            "total_marks": 2,
        }
        exam.save(update_fields=["exam_rules"])
        attempt = create_attempt(
            user_id=user.id,
            exam_id=exam.id,
            attempt_type="topic",
            duration_seconds=600,
        )
        start_attempt(attempt_id=attempt.id)
        wrong = QuestionOptionFactory(
            question=published_question, is_correct=False
        )
        save_answer(
            attempt_id=attempt.id,
            question_id=published_question.id,
            selected_option_id=wrong.id,
            state="answered",
        )
        _force_submitted(attempt)

        scored = score_attempt(attempt_id=attempt.id)

        assert scored.score == Decimal("0")


class TestAutoSubmitExpiredAttempts:
    def _expired_attempt(self, exam, user, *, duration=60, age=61):
        attempt = create_attempt(
            user_id=user.id,
            exam_id=exam.id,
            attempt_type="topic",
            duration_seconds=duration,
        )
        start_attempt(attempt_id=attempt.id)
        attempt.started_at = timezone.now() - timedelta(seconds=age)
        attempt.save(update_fields=["started_at"])
        return attempt

    def test_submits_expired_in_progress_attempt(self, exam, user):
        attempt = self._expired_attempt(exam, user)

        processed = submit_expired_attempts()

        attempt.refresh_from_db()
        assert processed == 1
        # submit_attempt now auto-scores, so the final status is "scored".
        assert attempt.status == "scored"

    def test_skips_attempt_within_duration(self, exam, user):
        """An attempt whose timer has not elapsed is left untouched."""
        attempt = create_attempt(
            user_id=user.id,
            exam_id=exam.id,
            attempt_type="topic",
            duration_seconds=3600,
        )
        start_attempt(attempt_id=attempt.id)  # started just now

        processed = submit_expired_attempts()

        attempt.refresh_from_db()
        assert processed == 0
        assert attempt.status == "in_progress"

    def test_skips_attempt_without_timer(self, exam, user):
        """Attempts with no started_at/duration are not auto-submittable."""
        attempt = create_attempt(
            user_id=user.id,
            exam_id=exam.id,
            attempt_type="topic",
        )
        # status="created", no started_at — must never be swept.
        processed = submit_expired_attempts()

        attempt.refresh_from_db()
        assert processed == 0
        assert attempt.status == "created"

    def test_skips_already_submitted_attempt(self, exam, user):
        """A concurrent manual submit wins; the sweep must not re-process it."""
        attempt = self._expired_attempt(exam, user)
        # Simulate the student submitting first (auto-scores → "scored").
        submit_attempt(attempt_id=attempt.id)

        processed = submit_expired_attempts()

        attempt.refresh_from_db()
        assert processed == 0
        assert attempt.status == "scored"

    def test_is_idempotent_across_repeated_sweeps(self, exam, user):
        """Re-running the sweep finalizes each attempt exactly once."""
        attempt = self._expired_attempt(exam, user)

        first = submit_expired_attempts()
        second = submit_expired_attempts()

        attempt.refresh_from_db()
        assert first == 1
        assert second == 0
        assert attempt.status == "scored"

    def test_returns_zero_when_nothing_expired(self, exam, user):
        assert submit_expired_attempts() == 0

    def test_submits_only_expired_among_many(self, exam, user):
        expired = self._expired_attempt(exam, user)
        fresh = create_attempt(
            user_id=user.id,
            exam_id=exam.id,
            attempt_type="topic",
            duration_seconds=3600,
        )
        start_attempt(attempt_id=fresh.id)

        processed = submit_expired_attempts()

        expired.refresh_from_db()
        fresh.refresh_from_db()
        assert processed == 1
        assert expired.status == "scored"
        assert fresh.status == "in_progress"


class TestConcurrencyHardening:
    """B2: submit_attempt / score_attempt re-validate under a row lock, so a
    finalized attempt cannot be regressed or scored twice."""

    def _scored_attempt(self, exam, user):
        attempt = create_attempt(
            user_id=user.id,
            exam_id=exam.id,
            attempt_type="topic",
            duration_seconds=3600,
        )
        start_attempt(attempt_id=attempt.id)
        submit_attempt(attempt_id=attempt.id)  # auto-scores → "scored"
        attempt.refresh_from_db()
        assert attempt.status == "scored"
        return attempt

    def test_resubmit_scored_attempt_is_rejected_without_regression(
        self, exam, user
    ):
        attempt = self._scored_attempt(exam, user)

        with pytest.raises(InvalidAttemptTransitionError):
            submit_attempt(attempt_id=attempt.id)

        attempt.refresh_from_db()
        # The scored → submitted regression must not happen.
        assert attempt.status == "scored"

    def test_rescore_scored_attempt_is_rejected_without_duplicate_analytics(
        self, exam, user
    ):
        from analytics.models import AttemptSectionAnalytics

        attempt = self._scored_attempt(exam, user)
        before = AttemptSectionAnalytics.objects.filter(attempt=attempt).count()

        with pytest.raises(InvalidAttemptTransitionError):
            score_attempt(attempt_id=attempt.id)

        attempt.refresh_from_db()
        assert attempt.status == "scored"
        after = AttemptSectionAnalytics.objects.filter(attempt=attempt).count()
        assert after == before  # no extra analytics from a rejected re-score

    @pytest.mark.concurrency
    @pytest.mark.django_db(transaction=True)
    def test_concurrent_submits_finalize_exactly_once(self):
        """Postgres-only: two threads submitting the same in-progress attempt
        must result in exactly one finalize (one success, one clean rejection),
        with no scored → submitted regression. Skipped on SQLite, which does not
        enforce row locking."""
        import threading

        from django.db import connection, connections

        if connection.vendor != "postgresql":
            pytest.skip("row-locking is only enforced on PostgreSQL")

        from accounts.tests.factories import UserFactory

        from .factories import ExamFactory

        user = UserFactory(is_email_verified=True, status="active")
        exam = ExamFactory()
        attempt = create_attempt(
            user_id=user.id,
            exam_id=exam.id,
            attempt_type="topic",
            duration_seconds=3600,
        )
        start_attempt(attempt_id=attempt.id)
        attempt_id = attempt.id

        results: dict[str, str] = {}

        def worker(name: str) -> None:
            try:
                submit_attempt(attempt_id=attempt_id)
                results[name] = "ok"
            except InvalidAttemptTransitionError:
                results[name] = "rejected"
            finally:
                connections.close_all()

        threads = [
            threading.Thread(target=worker, args=(n,)) for n in ("a", "b")
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert sorted(results.values()) == ["ok", "rejected"]
        attempt.refresh_from_db()
        assert attempt.status == "scored"


class TestSaveAnswer:
    def test_saves_answer(self, attempt, published_question):
        answer = save_answer(
            attempt_id=attempt.id,
            question_id=published_question.id,
            state="answered",
            time_spent_seconds=30,
        )
        assert answer.attempt_id == attempt.id
        assert answer.question_id == published_question.id
        assert answer.time_spent_seconds == 30

    def test_rejects_non_in_progress_attempt(
        self, attempt, published_question
    ):
        # submit_attempt auto-scores, leaving status="scored".
        # save_answer rejects any attempt that is not "in_progress".
        submit_attempt(attempt_id=attempt.id)
        with pytest.raises(AttemptAlreadySubmittedError):
            save_answer(
                attempt_id=attempt.id,
                question_id=published_question.id,
                state="answered",
            )

    def test_idempotent_save(self, attempt, published_question):
        a1 = save_answer(
            attempt_id=attempt.id,
            question_id=published_question.id,
            state="answered",
        )
        a2 = save_answer(
            attempt_id=attempt.id,
            question_id=published_question.id,
            state="marked",
        )
        assert a1.id == a2.id
        assert a2.state == "marked"

    def test_sets_correct_answer(
        self, attempt, published_question
    ):
        option = QuestionOptionFactory(
            question=published_question, is_correct=True
        )
        answer = save_answer(
            attempt_id=attempt.id,
            question_id=published_question.id,
            selected_option_id=option.id,
            state="answered",
        )
        assert answer.is_correct is True

    def test_sets_incorrect_answer(
        self, attempt, published_question
    ):
        wrong = QuestionOptionFactory(
            question=published_question, is_correct=False
        )
        right = QuestionOptionFactory(
            question=published_question, is_correct=True
        )
        answer = save_answer(
            attempt_id=attempt.id,
            question_id=published_question.id,
            selected_option_id=wrong.id,
            state="answered",
        )
        assert answer.is_correct is False


class TestMockTestNotPublished:
    def test_start_attempt_rejects_unpublished_mock(
        self, exam, user, unpublished_mock_test, published_question
    ):
        attempt = create_attempt(
            user_id=user.id,
            exam_id=exam.id,
            attempt_type="full_mock",
            mock_test_id=unpublished_mock_test.id,
        )
        with pytest.raises(MockTestNotPublishedError):
            start_attempt(attempt_id=attempt.id)
