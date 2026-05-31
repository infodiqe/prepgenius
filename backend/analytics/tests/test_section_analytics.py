import pytest
from decimal import Decimal
from django.db import connection
from django.test.utils import CaptureQueriesContext

from analytics.models import AttemptSectionAnalytics
from analytics.services.section_analytics import check_pass_line, compute_section_analytics
from attempts.models import ExamAttempt, UserAnswer
from attempts.services.attempt_services import score_attempt
from attempts.tests.factories import (
    ExamAttemptFactory,
    ExamFactory,
    InProgressAttemptFactory,
    PublishedQuestionFactory,
    QuestionOptionFactory,
    SubjectFactory,
    SubtopicFactory,
    TopicFactory,
    UserAnswerFactory,
)


@pytest.mark.django_db
class TestSectionAnalytics:
    def test_compute_section_analytics_correct_subject_breakdown(self) -> None:
        exam = ExamFactory()
        subject_1 = SubjectFactory(exam=exam, name="Subject 1")
        subject_2 = SubjectFactory(exam=exam, name="Subject 2")

        topic_1 = TopicFactory(subject=subject_1)
        topic_2 = TopicFactory(subject=subject_2)

        subtopic_1 = SubtopicFactory(topic=topic_1)
        subtopic_2 = SubtopicFactory(topic=topic_2)

        q1 = PublishedQuestionFactory(exam=exam, subtopic=subtopic_1)
        q2 = PublishedQuestionFactory(exam=exam, subtopic=subtopic_2)

        attempt = InProgressAttemptFactory(exam=exam, total_questions=2)

        # Subject 1 answer is correct, Subject 2 answer is incorrect
        opt1_correct = QuestionOptionFactory(question=q1, is_correct=True)
        opt2_incorrect = QuestionOptionFactory(question=q2, is_correct=False)

        a1 = UserAnswerFactory(
            attempt=attempt,
            question=q1,
            selected_option=opt1_correct,
            is_correct=True,
            state="answered",
            time_spent_seconds=40,
        )
        a2 = UserAnswerFactory(
            attempt=attempt,
            question=q2,
            selected_option=opt2_incorrect,
            is_correct=False,
            state="answered",
            time_spent_seconds=60,
        )

        answers = [a1, a2]
        # Re-fetch answers with select_related to mirror service behaviour
        answers_fetched = list(
            UserAnswer.objects.filter(attempt=attempt)
            .select_related("question__subtopic__topic__subject")
            .all()
        )

        compute_section_analytics(attempt=attempt, answers=answers_fetched)

        # Verify subject breakdown
        subject_analytics = AttemptSectionAnalytics.objects.filter(
            attempt=attempt, scope_type="subject"
        )
        assert subject_analytics.count() == 2

        s1_ana = subject_analytics.get(scope_id=subject_1.id)
        assert s1_ana.total == 1
        assert s1_ana.correct == 1
        assert s1_ana.accuracy == Decimal("100.00")
        assert s1_ana.avg_time == Decimal("40.00")

        s2_ana = subject_analytics.get(scope_id=subject_2.id)
        assert s2_ana.total == 1
        assert s2_ana.correct == 0
        assert s2_ana.accuracy == Decimal("0.00")
        assert s2_ana.avg_time == Decimal("60.00")

    def test_compute_section_analytics_correct_topic_breakdown(self) -> None:
        exam = ExamFactory()
        subject = SubjectFactory(exam=exam)
        topic_1 = TopicFactory(subject=subject, name="Topic 1")
        topic_2 = TopicFactory(subject=subject, name="Topic 2")

        subtopic_1 = SubtopicFactory(topic=topic_1)
        subtopic_2 = SubtopicFactory(topic=topic_2)

        q1 = PublishedQuestionFactory(exam=exam, subtopic=subtopic_1)
        q2 = PublishedQuestionFactory(exam=exam, subtopic=subtopic_2)

        attempt = InProgressAttemptFactory(exam=exam, total_questions=2)

        # Topic 1 answer is correct, Topic 2 is incorrect
        opt1_correct = QuestionOptionFactory(question=q1, is_correct=True)
        opt2_incorrect = QuestionOptionFactory(question=q2, is_correct=False)

        a1 = UserAnswerFactory(
            attempt=attempt,
            question=q1,
            selected_option=opt1_correct,
            is_correct=True,
            state="answered",
            time_spent_seconds=30,
        )
        a2 = UserAnswerFactory(
            attempt=attempt,
            question=q2,
            selected_option=opt2_incorrect,
            is_correct=False,
            state="answered",
            time_spent_seconds=50,
        )

        answers_fetched = list(
            UserAnswer.objects.filter(attempt=attempt)
            .select_related("question__subtopic__topic__subject")
            .all()
        )

        compute_section_analytics(attempt=attempt, answers=answers_fetched)

        # Verify topic breakdown
        topic_analytics = AttemptSectionAnalytics.objects.filter(
            attempt=attempt, scope_type="topic"
        )
        assert topic_analytics.count() == 2

        t1_ana = topic_analytics.get(scope_id=topic_1.id)
        assert t1_ana.total == 1
        assert t1_ana.correct == 1
        assert t1_ana.accuracy == Decimal("100.00")
        assert t1_ana.avg_time == Decimal("30.00")

        t2_ana = topic_analytics.get(scope_id=topic_2.id)
        assert t2_ana.total == 1
        assert t2_ana.correct == 0
        assert t2_ana.accuracy == Decimal("0.00")
        assert t2_ana.avg_time == Decimal("50.00")

    def test_compute_section_analytics_pass_line_comparison(self) -> None:
        passing_criteria_general_60 = {
            "general": {"required_percentage": 60},
        }
        passing_criteria_general_50 = {
            "general": {"required_percentage": 50},
        }

        # 55% accuracy
        assert not check_pass_line(
            accuracy=Decimal("55.00"),
            passing_criteria=passing_criteria_general_60,
        )
        assert check_pass_line(
            accuracy=Decimal("55.00"),
            passing_criteria=passing_criteria_general_50,
        )
        # 60% accuracy
        assert check_pass_line(
            accuracy=Decimal("60.00"),
            passing_criteria=passing_criteria_general_60,
        )

        # Fallback to 60% when criteria is empty
        assert not check_pass_line(accuracy=Decimal("59.99"), passing_criteria={})
        assert check_pass_line(accuracy=Decimal("60.00"), passing_criteria={})

    def test_section_analytics_idempotent(self) -> None:
        exam = ExamFactory()
        subject = SubjectFactory(exam=exam)
        topic = TopicFactory(subject=subject)
        subtopic = SubtopicFactory(topic=topic)
        q = PublishedQuestionFactory(exam=exam, subtopic=subtopic)
        attempt = InProgressAttemptFactory(exam=exam, total_questions=1)

        opt = QuestionOptionFactory(question=q, is_correct=True)
        UserAnswerFactory(
            attempt=attempt,
            question=q,
            selected_option=opt,
            is_correct=True,
            state="answered",
        )

        answers = list(
            UserAnswer.objects.filter(attempt=attempt)
            .select_related("question__subtopic__topic__subject")
            .all()
        )

        # Compute first time
        compute_section_analytics(attempt=attempt, answers=answers)
        assert AttemptSectionAnalytics.objects.filter(attempt=attempt).count() == 2

        # Compute second time — should clear and re-create, not duplicate
        compute_section_analytics(attempt=attempt, answers=answers)
        assert AttemptSectionAnalytics.objects.filter(attempt=attempt).count() == 2

    def test_section_analytics_query_count_and_scoring_integration(self) -> None:
        exam = ExamFactory()
        subject = SubjectFactory(exam=exam)
        topic = TopicFactory(subject=subject)
        subtopic = SubtopicFactory(topic=topic)

        # Create multiple questions to check N+1 query safety
        questions = [PublishedQuestionFactory(exam=exam, subtopic=subtopic) for _ in range(5)]

        attempt = InProgressAttemptFactory(exam=exam, total_questions=5)

        for q in questions:
            opt = QuestionOptionFactory(question=q, is_correct=True)
            UserAnswerFactory(
                attempt=attempt,
                question=q,
                selected_option=opt,
                is_correct=True,
                state="answered",
                time_spent_seconds=20,
            )

        attempt.status = "submitted"
        attempt.save()

        # Score attempt and capture queries to assert no N+1 queries occur
        with CaptureQueriesContext(connection) as ctx:
            scored = score_attempt(attempt_id=attempt.id)

        # We assert that the database returns section analytics correctly
        sec_analytics = AttemptSectionAnalytics.objects.filter(attempt=scored)
        assert sec_analytics.count() == 2  # 1 subject + 1 topic
        subject_ana = sec_analytics.get(scope_type="subject")
        assert subject_ana.total == 5
        assert subject_ana.correct == 5
        assert subject_ana.accuracy == Decimal("100.00")
        assert subject_ana.avg_time == Decimal("20.00")

        # Let's ensure query count is bounded.
        # Queries expected:
        # 1. Fetch attempt
        # 2. Get answers + questions + subtopics + topics + subjects (single select_related query)
        # 3. Get mock marks
        # 4. Save attempt update fields
        # 5. Delete old section analytics
        # 6. Bulk create new section analytics
        # 7. Refresh attempt from DB
        # Total queries should be around 7, regardless of the number of answers (5 answers).
        # Without select_related, there would be 5 extra queries for subtopic, 5 for topic, 5 for subject (15 extra queries!).
        assert len(ctx) <= 12  # well below N+1 triggers
