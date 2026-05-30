from django.utils import timezone
from rest_framework.exceptions import ValidationError

from accounts.models import User
from accounts.selectors.user_selectors import active_exam_queryset

_UNSET = object()


def update_user_profile(
    *,
    user: User,
    full_name: str | None = None,
    phone_e164: str | None = None,
    preferred_language: str | None = None,
    target_exam_id=_UNSET,
    exam_date=_UNSET,
) -> User:
    update_fields: list[str] = []

    if full_name is not None:
        user.full_name = full_name
        update_fields.append("full_name")

    if phone_e164 is not None:
        phone = phone_e164.strip() if phone_e164 else None
        if phone:
            if User.objects.filter(phone_e164=phone).exclude(id=user.id).exists():
                raise ValidationError("Phone number already in use")
        user.phone_e164 = phone
        update_fields.append("phone_e164")

    if preferred_language is not None:
        user.preferred_language = preferred_language
        update_fields.append("preferred_language")

    if target_exam_id is not _UNSET:
        if target_exam_id is None:
            user.target_exam = None
        else:
            if not active_exam_queryset().filter(id=target_exam_id).exists():
                raise ValidationError("Exam not found or not active")
            user.target_exam_id = target_exam_id
        update_fields.append("target_exam")

    if exam_date is not _UNSET:
        user.exam_date = exam_date
        update_fields.append("exam_date")

    if update_fields:
        user.save(update_fields=update_fields)
        user.refresh_from_db()

    return user
