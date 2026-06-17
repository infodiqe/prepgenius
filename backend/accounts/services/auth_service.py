import logging
from uuid import UUID

from django.conf import settings
from django.contrib.auth import authenticate
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.exceptions import AccountLockedError
from accounts.models import User

logger = logging.getLogger(__name__)


def _is_locked(user: User, *, now=None) -> bool:
    now = now or timezone.now()
    return user.locked_until is not None and user.locked_until > now


def _record_failed_login(user_id: UUID) -> bool:
    """Atomically increment the failure counter; lock the account on threshold.

    Race-safe: the row is taken under ``select_for_update`` so concurrent failed
    logins cannot lose increments or each independently trip the threshold.
    Returns True if this failure pushed the account into a locked state.
    """
    threshold = settings.ACCOUNT_LOCKOUT_THRESHOLD
    window = settings.ACCOUNT_LOCKOUT_WINDOW

    with transaction.atomic():
        user = User.objects.select_for_update().get(pk=user_id)
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= threshold:
            user.locked_until = timezone.now() + window
            # Zero the counter so a fresh streak is required after the lock lifts.
            user.failed_login_attempts = 0
            user.save(update_fields=["failed_login_attempts", "locked_until"])
            logger.warning("Account %s locked after %s failed logins", user_id, threshold)
            return True
        user.save(update_fields=["failed_login_attempts"])
        return False


def _reset_lockout(user: User) -> None:
    if user.failed_login_attempts or user.locked_until is not None:
        user.failed_login_attempts = 0
        user.locked_until = None
        user.save(update_fields=["failed_login_attempts", "locked_until"])


def login_user(*, email: str, password: str) -> tuple[str, str]:
    email = email.strip().lower()

    # Resolve the account up front so per-account lockout can be enforced.
    # Lockout state is tracked ONLY for real, non-deleted accounts: we never
    # create or mutate state for unknown emails, so a single login probe cannot
    # be used to enumerate which addresses are registered.
    lockable_user = (
        User.objects.filter(email=email).exclude(status="deleted").first()
    )

    if lockable_user is not None and _is_locked(lockable_user):
        raise AccountLockedError()

    user = authenticate(request=None, username=email, password=password)

    if user is None:
        # Wrong password (or unknown email). Only count failures against a real,
        # non-deleted account; unknown emails leave no trace.
        if lockable_user is not None:
            if _record_failed_login(lockable_user.pk):
                raise AccountLockedError()
        raise AuthenticationFailed("Invalid credentials")

    if user.status == "deleted":
        raise AuthenticationFailed("Account not found")

    if user.status == "suspended":
        raise AuthenticationFailed("Account suspended")

    if not user.is_email_verified or user.status == "pending":
        raise AuthenticationFailed(
            "Email not verified. Check your inbox or request a new verification email."
        )

    # Successful authentication clears any accumulated lockout state.
    _reset_lockout(user)

    user.last_login = timezone.now()
    user.save(update_fields=["last_login"])

    refresh = RefreshToken.for_user(user)
    access = refresh.access_token

    return str(access), str(refresh)
