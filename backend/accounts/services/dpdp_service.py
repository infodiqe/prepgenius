import logging

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from accounts.models import EmailVerificationToken, PasswordResetToken, User
from accounts.tasks.dpdp_tasks import export_user_data_async

logger = logging.getLogger(__name__)


def request_data_export(*, user: User) -> None:
    export_user_data_async.delay(str(user.id))


def anonymize_user(*, user: User) -> None:
    """DPDP-compliant anonymization: scrub PII, tombstone, and revoke sessions.

    Soft-delete only — the row is preserved (status="deleted", is_active=False,
    deleted_at set) so audit/history references to the user remain intact, while
    personal data is overwritten. This is the single source of anonymization
    logic, shared by the self-service ``delete_account`` flow and the admin
    "Anonymize and Deactivate" action (ADMIN-HARDEN-02 / P0). It performs no
    authorization or password check — callers are responsible for authorizing
    the operation.
    """
    now = timezone.now()

    with transaction.atomic():
        user.email = f"deleted_{user.id}@deleted.prepgenius.invalid"
        user.full_name = "Deleted User"
        user.phone_e164 = None
        user.status = "deleted"
        user.deleted_at = now
        user.is_active = False
        user.set_unusable_password()
        user.save()

        EmailVerificationToken.objects.filter(user=user).delete()
        PasswordResetToken.objects.filter(user=user).delete()

        from rest_framework_simplejwt.token_blacklist.models import (
            BlacklistedToken,
            OutstandingToken,
        )

        # Blacklist all outstanding JWT refresh tokens so existing sessions
        # are invalidated. Do NOT delete OutstandingToken rows — BlacklistedToken
        # has ON DELETE CASCADE to OutstandingToken, so deleting the outstanding
        # tokens would cascade-delete the blacklist entries and undo the revocation.
        outstanding = OutstandingToken.objects.filter(user=user)
        for token in outstanding:
            BlacklistedToken.objects.get_or_create(token=token)

    logger.info("Account anonymized: user=%s deleted_at=%s", user.id, now)


def delete_account(*, user: User, password: str) -> None:
    if not user.check_password(password):
        raise ValidationError("Incorrect password")

    anonymize_user(user=user)
