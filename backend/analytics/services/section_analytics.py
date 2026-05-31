from collections import defaultdict
from decimal import Decimal
from django.db import transaction

from analytics.models import AttemptSectionAnalytics
from attempts.models import ExamAttempt, UserAnswer


def compute_section_analytics(*, attempt: ExamAttempt, answers: list[UserAnswer]) -> None:
    """Computes subject and topic level accuracy and average time per question

    and writes them synchronously to AttemptSectionAnalytics.
    """
    # 1. Clear existing section analytics for this attempt to ensure idempotency
    AttemptSectionAnalytics.objects.filter(attempt=attempt).delete()

    subject_stats = defaultdict(
        lambda: {"total": 0, "correct": 0, "answered": 0, "time_spent": 0}
    )
    topic_stats = defaultdict(
        lambda: {"total": 0, "correct": 0, "answered": 0, "time_spent": 0}
    )

    for answer in answers:
        question = answer.question
        subtopic = question.subtopic
        topic = subtopic.topic
        subject = topic.subject

        # subject metrics
        s_stats = subject_stats[subject.id]
        s_stats["total"] += 1
        if answer.state in ("answered", "answered_marked"):
            s_stats["answered"] += 1
            if answer.is_correct:
                s_stats["correct"] += 1
        s_stats["time_spent"] += answer.time_spent_seconds

        # topic metrics
        t_stats = topic_stats[topic.id]
        t_stats["total"] += 1
        if answer.state in ("answered", "answered_marked"):
            t_stats["answered"] += 1
            if answer.is_correct:
                t_stats["correct"] += 1
        t_stats["time_spent"] += answer.time_spent_seconds

    section_analytics_to_create = []

    # Prepare Subject analytics rows
    for subject_id, stats in subject_stats.items():
        total = stats["total"]
        correct = stats["correct"]
        answered = stats["answered"]
        time_spent = stats["time_spent"]

        accuracy = None
        if answered > 0:
            accuracy = Decimal(str(round(correct / answered * 100, 2)))

        avg_time = None
        if total > 0:
            avg_time = Decimal(str(round(time_spent / total, 2)))

        section_analytics_to_create.append(
            AttemptSectionAnalytics(
                attempt=attempt,
                scope_type="subject",
                scope_id=subject_id,
                total=total,
                correct=correct,
                accuracy=accuracy,
                avg_time=avg_time,
            )
        )

    # Prepare Topic analytics rows
    for topic_id, stats in topic_stats.items():
        total = stats["total"]
        correct = stats["correct"]
        answered = stats["answered"]
        time_spent = stats["time_spent"]

        accuracy = None
        if answered > 0:
            accuracy = Decimal(str(round(correct / answered * 100, 2)))

        avg_time = None
        if total > 0:
            avg_time = Decimal(str(round(time_spent / total, 2)))

        section_analytics_to_create.append(
            AttemptSectionAnalytics(
                attempt=attempt,
                scope_type="topic",
                scope_id=topic_id,
                total=total,
                correct=correct,
                accuracy=accuracy,
                avg_time=avg_time,
            )
        )

    if section_analytics_to_create:
        AttemptSectionAnalytics.objects.bulk_create(section_analytics_to_create)


def check_pass_line(*, accuracy: Decimal, passing_criteria: dict) -> bool:
    """Helper to check if a given section/subject accuracy satisfies the passing criteria

    (default general required percentage is 60%).
    """
    if not passing_criteria:
        req = 60
    else:
        req = passing_criteria.get("general", {}).get("required_percentage", 60)
    return accuracy >= Decimal(str(req))
