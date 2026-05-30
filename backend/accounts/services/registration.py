import secrets
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from accounts.models import EmailVerificationToken, User, UserConsent
from accounts.tasks.email_tasks import send_verification_email


def create_user(
    *,
    email: str,
    full_name: str,
    password: str,
    phone_e164: str | None = None,
    preferred_language: str = "as",
    ip_address: str | None = None,
) -> User:
    email = email.strip().lower()

    if User.objects.filter(email=email).exists():
        raise ValidationError("Email already registered")

    with transaction.atomic():
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            full_name=full_name,
            preferred_language=preferred_language,
            phone_e164=phone_e164 or None,
            status="pending",
            is_email_verified=False,
        )

        UserConsent.objects.create(
            user=user,
            purpose="data_processing",
            consent_version=settings.CONSENT_VERSION,
            granted=True,
            ip_address=ip_address,
        )

        token_value = secrets.token_urlsafe(48)
        EmailVerificationToken.objects.create(
            user=user,
            token=token_value,
            expires_at=timezone.now() + timedelta(hours=24),
        )

    send_verification_email.delay(str(user.id), token_value)

    return user
