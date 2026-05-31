from uuid import UUID

from django.db.models import Prefetch, QuerySet

from exams.models import (
    Exam,
    PreviousYearPaper,
    Subject,
    Subtopic,
    SyllabusItem,
    Topic,
)


# ── Exam ─────────────────────────────────────────────────────────────────────


def get_exam_by_id(*, exam_id: UUID) -> Exam:
    return Exam.objects.get(id=exam_id)


def list_active_exams() -> QuerySet[Exam]:
    return Exam.objects.filter(is_active=True).order_by("code")


def list_exams() -> QuerySet[Exam]:
    return Exam.objects.all().order_by("code")


# ── Subject ──────────────────────────────────────────────────────────────────


def get_subject_by_id(*, subject_id: UUID) -> Subject:
    return Subject.objects.select_related("exam").get(id=subject_id)


def list_subjects_for_exam(*, exam_id: UUID) -> QuerySet[Subject]:
    return (
        Subject.objects.filter(exam_id=exam_id)
        .select_related("exam")
        .order_by("position")
    )


# ── Topic ────────────────────────────────────────────────────────────────────


def get_topic_by_id(*, topic_id: UUID) -> Topic:
    return Topic.objects.select_related("subject__exam").get(id=topic_id)


def list_topics_for_subject(*, subject_id: UUID) -> QuerySet[Topic]:
    return (
        Topic.objects.filter(subject_id=subject_id)
        .select_related("subject__exam")
        .order_by("position")
    )


# ── Subtopic ─────────────────────────────────────────────────────────────────


def get_subtopic_by_id(*, subtopic_id: UUID) -> Subtopic:
    return Subtopic.objects.select_related("topic__subject__exam").get(
        id=subtopic_id
    )


def list_subtopics_for_topic(*, topic_id: UUID) -> QuerySet[Subtopic]:
    return (
        Subtopic.objects.filter(topic_id=topic_id)
        .select_related("topic__subject__exam")
        .order_by("position")
    )


# ── Syllabus Item ────────────────────────────────────────────────────────────


def get_syllabus_item_by_id(*, syllabus_item_id: UUID) -> SyllabusItem:
    return SyllabusItem.objects.select_related(
        "exam", "parent", "topic", "subtopic"
    ).get(id=syllabus_item_id)


def list_syllabus_for_exam(*, exam_id: UUID) -> QuerySet[SyllabusItem]:
    return (
        SyllabusItem.objects.filter(exam_id=exam_id)
        .select_related("exam", "parent", "topic", "subtopic")
        .order_by("position")
    )


def get_syllabus_tree(*, exam_id: UUID) -> QuerySet[SyllabusItem]:
    return (
        SyllabusItem.objects.filter(exam_id=exam_id, parent__isnull=True)
        .select_related("exam", "topic", "subtopic")
        .prefetch_related(
            Prefetch(
                "syllabusitem_set",
                queryset=SyllabusItem.objects.select_related(
                    "topic", "subtopic"
                ).order_by("position"),
            )
        )
        .order_by("position")
    )


# ── Previous Year Paper ──────────────────────────────────────────────────────


def get_previous_year_paper_by_id(*, paper_id: UUID) -> PreviousYearPaper:
    return PreviousYearPaper.objects.select_related(
        "exam", "uploaded_by"
    ).get(id=paper_id)


def list_previous_year_papers(
    *, exam_id: UUID | None = None
) -> QuerySet[PreviousYearPaper]:
    qs = PreviousYearPaper.objects.select_related("exam", "uploaded_by")
    if exam_id is not None:
        qs = qs.filter(exam_id=exam_id)
    return qs.order_by("-year", "code")


# ── Exam Hierarchy ───────────────────────────────────────────────────────────


def get_complete_exam_hierarchy(*, exam_id: UUID) -> QuerySet[Subject]:
    return (
        Subject.objects.filter(exam_id=exam_id)
        .select_related("exam")
        .prefetch_related(
            Prefetch(
                "topics",
                queryset=Topic.objects.prefetch_related(
                    Prefetch(
                        "subtopics",
                        queryset=Subtopic.objects.order_by("position"),
                    )
                ).order_by("position"),
            )
        )
        .order_by("position")
    )
