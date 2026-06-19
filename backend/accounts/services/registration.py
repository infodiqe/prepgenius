import secrets
from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from accounts.models import EmailVerificationToken, Role, User, UserConsent, UserRole
from accounts.models.rbac import STUDENT
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

        # AUTH-HOTFIX-01: every registered user is a platform-wide student.
        # Assigned inside the same atomic block so that a missing role
        # definition rolls the whole registration back rather than creating a
        # role-less user that would fail IsStudent on every attempt endpoint.
        try:
            student_role = Role.objects.get(name=STUDENT)
        except Role.DoesNotExist as exc:
            raise ImproperlyConfigured(
                "The 'student' role is not seeded. Run `manage.py seed_roles` "
                "before registering users."
            ) from exc
        UserRole.objects.get_or_create(
            user=user, role=student_role, institution_id=None
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
