import secrets
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from accounts.models import EmailVerificationToken, User
from accounts.tasks.email_tasks import send_verification_email


def verify_email(*, token: str) -> User:
    try:
        token_obj = EmailVerificationToken.objects.select_related("user").get(
            token=token, is_used=False
        )
    except EmailVerificationToken.DoesNotExist:
        raise ValidationError("Invalid or already used token")

    if token_obj.expires_at <= timezone.now():
        raise ValidationError("Verification token expired")

    with transaction.atomic():
        token_obj.is_used = True
        token_obj.save()

        user = token_obj.user
        user.is_email_verified = True
        user.status = "active"
        user.save()

    return user


def resend_verification(*, email: str) -> None:
    email = email.strip().lower()

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        raise ValidationError("No account with this email")

    if user.is_email_verified:
        raise ValidationError("Email already verified")

    EmailVerificationToken.objects.filter(
        user=user, is_used=False
    ).update(is_used=True)

    token_value = secrets.token_urlsafe(48)
    EmailVerificationToken.objects.create(
        user=user,
        token=token_value,
        expires_at=timezone.now() + timedelta(hours=24),
    )

    send_verification_email.delay(str(user.id), token_value)
