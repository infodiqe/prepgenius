import secrets
from datetime import timedelta

from django.contrib.auth.password_validation import validate_password as django_validate_password
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from accounts.models import PasswordResetToken, User
from accounts.tasks.email_tasks import send_password_reset_email


def request_password_reset(*, email: str) -> None:
    email = email.strip().lower()

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return

    if user.status == "deleted":
        return

    PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)

    token_value = secrets.token_urlsafe(48)
    PasswordResetToken.objects.create(
        user=user,
        token=token_value,
        expires_at=timezone.now() + timedelta(hours=1),
    )

    send_password_reset_email.delay(str(user.id), token_value)


def confirm_password_reset(*, token: str, new_password: str) -> User:
    try:
        token_obj = PasswordResetToken.objects.select_related("user").get(
            token=token, is_used=False
        )
    except PasswordResetToken.DoesNotExist:
        raise ValidationError("Invalid or expired reset token")

    if token_obj.expires_at <= timezone.now():
        raise ValidationError("Reset token expired")

    user = token_obj.user

    try:
        django_validate_password(new_password, user=user)
    except Exception as exc:
        raise ValidationError(exc.messages if hasattr(exc, "messages") else str(exc))

    with transaction.atomic():
        token_obj.is_used = True
        token_obj.save()

        user.set_password(new_password)
        user.save()

        non_blacklisted = OutstandingToken.objects.filter(user=user).exclude(
            id__in=BlacklistedToken.objects.values("token_id")
        )
        BlacklistedToken.objects.bulk_create(
            [BlacklistedToken(token=ot) for ot in non_blacklisted]
        )

    return user


def change_password(*, user: User, current_password: str, new_password: str) -> User:
    """
    Change user password after verifying current password,
    enforcing Django password validators, and revoking existing sessions.
    """
    if not user.check_password(current_password):
        raise ValidationError("Incorrect current password")

    try:
        django_validate_password(new_password, user=user)
    except Exception as exc:
        raise ValidationError(exc.messages if hasattr(exc, "messages") else str(exc)) from exc

    with transaction.atomic():
        user.set_password(new_password)
        user.save()

        # Revoke other sessions/tokens for this user
        non_blacklisted = OutstandingToken.objects.filter(user=user).exclude(
            id__in=BlacklistedToken.objects.values("token_id")
        )
        BlacklistedToken.objects.bulk_create(
            [BlacklistedToken(token=ot) for ot in non_blacklisted]
        )

    return user

