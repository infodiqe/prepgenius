from uuid import UUID

from django.db.models import QuerySet

from accounts.models import User


def get_user_profile(*, user_id: UUID) -> User:
    return User.objects.select_related("target_exam").get(id=user_id)


def active_exam_queryset() -> QuerySet:
    from exams.models import Exam  # noqa: avoid circular import at module level

    return Exam.objects.filter(is_active=True)
