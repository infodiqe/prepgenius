from datetime import timedelta
from unittest.mock import MagicMock, patch

import pytest
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework.test import APIRequestFactory
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from accounts.permissions import HasRole, IsInstitutionScoped, IsPlatformAdmin, IsStudent

from accounts.exceptions import AccountLockedError
from accounts.models import EmailVerificationToken, PasswordResetToken, Permission, Role, User, UserConsent
from accounts.services.auth_service import login_user
from accounts.services.password_service import confirm_password_reset, request_password_reset
from accounts.services.registration import create_user
from accounts.services.verification import resend_verification, verify_email

from .factories import (
    EmailVerificationTokenFactory,
    ExamFactory,
    InactiveExamFactory,
    PasswordResetTokenFactory,
    PermissionFactory,
    RoleFactory,
    UserConsentFactory,
    UserFactory,
    UserRoleFactory,
)

pytestmark = pytest.mark.django_db


# ─── Task 5: Registration ─────────────────────────────────────────────────


# AUTH-HOTFIX-01: create_user now assigns the 'student' role (and raises if its
# definition is missing), so these direct-service tests must have roles seeded.
@pytest.mark.usefixtures("seed_roles")
class TestCreateUser:
    def test_happy_path_creates_user_consent_and_token(self):
        with patch("accounts.services.registration.send_verification_email.delay") as mock_task:
            user = create_user(
                email="Test@Example.com",
                full_name="Test User",
                password="SecurePass123!",
                phone_e164="+911234567890",
                ip_address="192.168.1.1",
            )

        assert user.email == "test@example.com"
        assert user.full_name == "Test User"
        assert user.status == "pending"
        assert user.is_email_verified is False
        assert user.preferred_language == "as"
        assert user.phone_e164 == "+911234567890"

        assert UserConsent.objects.filter(user=user, purpose="data_processing").exists()
        assert EmailVerificationToken.objects.filter(user=user, is_used=False).exists()

        mock_task.assert_called_once()

    def test_normalizes_email(self):
        with patch("accounts.services.registration.send_verification_email.delay"):
            user = create_user(
                email="  UPPER.CASE@Example.COM  ",
                full_name="Case Test",
                password="SecurePass123!",
            )
        assert user.email == "upper.case@example.com"

    def test_phone_none_when_blank(self):
        with patch("accounts.services.registration.send_verification_email.delay"):
            user = create_user(
                email="nophone@example.com",
                full_name="No Phone",
                password="SecurePass123!",
                phone_e164="",
            )
        assert user.phone_e164 is None

    def test_raises_on_duplicate_email(self):
        UserFactory(email="dup@example.com")
        with pytest.raises(ValidationError, match="Email already registered"):
            create_user(
                email="dup@example.com",
                full_name="Dup",
                password="SecurePass123!",
            )

    def test_does_not_create_user_on_duplicate(self):
        UserFactory(email="dup@example.com")
        with pytest.raises(ValidationError):
            create_user(
                email="dup@example.com",
                full_name="Dup",
                password="SecurePass123!",
            )
        assert User.objects.filter(email="dup@example.com").count() == 1

    def test_creates_consent_record(self):
        with patch("accounts.services.registration.send_verification_email.delay"):
            user = create_user(
                email="consent@example.com",
                full_name="Consent",
                password="SecurePass123!",
                ip_address="10.0.0.1",
            )
        consent = UserConsent.objects.get(user=user)
        assert consent.purpose == "data_processing"
        assert consent.consent_version == settings.CONSENT_VERSION
        assert consent.granted is True
        assert consent.ip_address == "10.0.0.1"

    def test_enqueues_verification_email(self):
        with patch("accounts.services.registration.send_verification_email.delay") as mock_task:
            user = create_user(
                email="tasktest@example.com",
                full_name="Task",
                password="SecurePass123!",
            )
            mock_task.assert_called_once_with(str(user.id), mock_task.call_args[0][1])

    def test_password_is_hashed(self):
        with patch("accounts.services.registration.send_verification_email.delay"):
            user = create_user(
                email="hash@example.com",
                full_name="Hash",
                password="SecurePass123!",
            )
        assert user.password != "SecurePass123!"
        assert user.password.startswith("argon2")


# ─── Task 6: Email verification ────────────────────────────────────────────


class TestVerifyEmail:
    def test_happy_path_activates_user(self):
        token = EmailVerificationTokenFactory()
        user = token.user
        assert user.is_email_verified is False
        assert user.status == "pending"

        result = verify_email(token=token.token)

        assert result == user
        user.refresh_from_db()
        assert user.is_email_verified is True
        assert user.status == "active"
        token.refresh_from_db()
        assert token.is_used is True

    def test_raises_on_invalid_token(self):
        with pytest.raises(ValidationError, match="Invalid or already used token"):
            verify_email(token="nonexistent-token")

    def test_raises_on_used_token(self):
        token = EmailVerificationTokenFactory(used=True)
        with pytest.raises(ValidationError, match="Invalid or already used token"):
            verify_email(token=token.token)

    def test_raises_on_expired_token(self):
        token = EmailVerificationTokenFactory(expired=True)
        with pytest.raises(ValidationError, match="Verification token expired"):
            verify_email(token=token.token)


class TestResendVerification:
    def test_happy_path_invalidates_old_and_creates_new(self):
        user = UserFactory()
        old_token = EmailVerificationTokenFactory(user=user)

        with patch("accounts.services.verification.send_verification_email.delay") as mock_task:
            resend_verification(email=user.email)

        old_token.refresh_from_db()
        assert old_token.is_used is True

        new_token = EmailVerificationToken.objects.filter(user=user, is_used=False).first()
        assert new_token is not None
        assert new_token.token != old_token.token

        mock_task.assert_called_once_with(str(user.id), new_token.token)

    def test_raises_on_nonexistent_email(self):
        with pytest.raises(ValidationError, match="No account with this email"):
            resend_verification(email="nobody@example.com")

    def test_raises_on_already_verified(self):
        user = UserFactory(verified=True)
        with pytest.raises(ValidationError, match="Email already verified"):
            resend_verification(email=user.email)


# ─── Task 7: Login ─────────────────────────────────────────────────────────


class TestLoginUser:
    def test_happy_path_returns_tokens(self):
        user = UserFactory(verified=True)
        access, refresh = login_user(email=user.email, password="TestPass123!")
        assert access is not None and isinstance(access, str)
        assert refresh is not None and isinstance(refresh, str)

    def test_updates_last_login(self):
        user = UserFactory(verified=True)
        old_last = user.last_login
        login_user(email=user.email, password="TestPass123!")
        user.refresh_from_db()
        assert user.last_login != old_last
        assert user.last_login is not None

    def test_raises_on_wrong_password(self):
        user = UserFactory(verified=True)
        with pytest.raises(AuthenticationFailed, match="Invalid credentials"):
            login_user(email=user.email, password="WrongPassword!")

    def test_raises_on_nonexistent_email(self):
        with pytest.raises(AuthenticationFailed, match="Invalid credentials"):
            login_user(email="nobody@example.com", password="TestPass123!")

    def test_raises_on_deleted_user(self):
        user = UserFactory(deleted=True)
        with pytest.raises(AuthenticationFailed, match="Account not found"):
            login_user(email=user.email, password="TestPass123!")

    def test_raises_on_suspended_user(self):
        user = UserFactory(suspended=True)
        with pytest.raises(AuthenticationFailed, match="Account suspended"):
            login_user(email=user.email, password="TestPass123!")

    def test_raises_on_unverified_email(self):
        user = UserFactory()  # default: is_email_verified=False, status="pending"
        with pytest.raises(AuthenticationFailed, match="Email not verified"):
            login_user(email=user.email, password="TestPass123!")

    def test_message_identical_for_wrong_email_and_wrong_password(self):
        user = UserFactory(verified=True)
        try:
            login_user(email="noone@example.com", password="TestPass123!")
        except AuthenticationFailed as exc:
            msg_no_user = str(exc.detail)
        try:
            login_user(email=user.email, password="WrongPassword!")
        except AuthenticationFailed as exc:
            msg_wrong_pw = str(exc.detail)
        assert msg_no_user == msg_wrong_pw == "Invalid credentials"


class TestLoginLockout:
    """PH-4: per-account brute-force lockout enforced in the auth service."""

    def _fail(self, email, times):
        results = []
        for _ in range(times):
            try:
                login_user(email=email, password="WrongPassword!")
            except (AuthenticationFailed, AccountLockedError) as exc:
                results.append(exc)
        return results

    def test_locks_after_threshold_consecutive_failures(self, settings):
        settings.ACCOUNT_LOCKOUT_THRESHOLD = 3
        user = UserFactory(verified=True)

        # First (threshold - 1) failures are plain invalid-credential errors.
        for _ in range(2):
            with pytest.raises(AuthenticationFailed, match="Invalid credentials"):
                login_user(email=user.email, password="WrongPassword!")

        # The threshold-th failure trips the lock.
        with pytest.raises(AccountLockedError):
            login_user(email=user.email, password="WrongPassword!")

        user.refresh_from_db()
        assert user.locked_until is not None
        assert user.locked_until > timezone.now()
        # Counter is zeroed when the lock is applied.
        assert user.failed_login_attempts == 0

    def test_locked_account_rejects_correct_password(self, settings):
        settings.ACCOUNT_LOCKOUT_THRESHOLD = 3
        user = UserFactory(verified=True)
        user.locked_until = timezone.now() + timedelta(minutes=15)
        user.save(update_fields=["locked_until"])

        with pytest.raises(AccountLockedError):
            login_user(email=user.email, password="TestPass123!")

    def test_lock_expires_after_window(self, settings):
        user = UserFactory(verified=True)
        user.locked_until = timezone.now() - timedelta(seconds=1)
        user.failed_login_attempts = 0
        user.save(update_fields=["locked_until", "failed_login_attempts"])

        access, _ = login_user(email=user.email, password="TestPass123!")
        assert access is not None

        user.refresh_from_db()
        assert user.locked_until is None
        assert user.failed_login_attempts == 0

    def test_successful_login_resets_failure_counter(self, settings):
        settings.ACCOUNT_LOCKOUT_THRESHOLD = 5
        user = UserFactory(verified=True)
        self._fail(user.email, 3)
        user.refresh_from_db()
        assert user.failed_login_attempts == 3

        login_user(email=user.email, password="TestPass123!")

        user.refresh_from_db()
        assert user.failed_login_attempts == 0
        assert user.locked_until is None

    def test_failed_increments_persist_across_attempts(self, settings):
        settings.ACCOUNT_LOCKOUT_THRESHOLD = 10
        user = UserFactory(verified=True)
        self._fail(user.email, 4)
        user.refresh_from_db()
        assert user.failed_login_attempts == 4

    def test_unknown_email_never_locks_and_creates_no_state(self, settings):
        settings.ACCOUNT_LOCKOUT_THRESHOLD = 2
        before = User.objects.count()

        results = self._fail("ghost@example.com", 5)

        # Always plain invalid-credentials; never an AccountLockedError.
        assert all(isinstance(r, AuthenticationFailed) for r in results)
        assert all(not isinstance(r, AccountLockedError) for r in results)
        # No phantom rows created for the unknown address.
        assert User.objects.count() == before

    def test_threshold_is_configurable(self, settings):
        settings.ACCOUNT_LOCKOUT_THRESHOLD = 2
        user = UserFactory(verified=True)

        with pytest.raises(AuthenticationFailed):
            login_user(email=user.email, password="WrongPassword!")
        with pytest.raises(AccountLockedError):
            login_user(email=user.email, password="WrongPassword!")

    def test_deleted_user_is_not_lockable(self, settings):
        """Deleted accounts are excluded from lockout tracking entirely."""
        settings.ACCOUNT_LOCKOUT_THRESHOLD = 2
        user = UserFactory(deleted=True)

        # Wrong password on a deleted account stays a generic failure and never
        # accumulates lockout state.
        for _ in range(3):
            with pytest.raises(AuthenticationFailed):
                login_user(email=user.email, password="WrongPassword!")

        user.refresh_from_db()
        assert user.failed_login_attempts == 0
        assert user.locked_until is None


# ─── Task 8: Password reset request ───────────────────────────────────────


class TestRequestPasswordReset:
    def test_happy_path_creates_token_and_enqueues_task(self):
        user = UserFactory()
        with patch(
            "accounts.services.password_service.send_password_reset_email.delay"
        ) as mock_task:
            request_password_reset(email=user.email)

        token_obj = PasswordResetToken.objects.filter(user=user, is_used=False).first()
        assert token_obj is not None
        mock_task.assert_called_once_with(str(user.id), token_obj.token)

    def test_invalidates_old_tokens(self):
        user = UserFactory()
        old_token = PasswordResetTokenFactory(user=user)

        with patch("accounts.services.password_service.send_password_reset_email.delay"):
            request_password_reset(email=user.email)

        old_token.refresh_from_db()
        assert old_token.is_used is True

    def test_silent_return_on_nonexistent_email(self):
        result = request_password_reset(email="nobody@example.com")
        assert result is None

    def test_silent_return_on_deleted_user(self):
        user = UserFactory(deleted=True)
        result = request_password_reset(email=user.email)
        assert result is None
        assert PasswordResetToken.objects.filter(user=user).count() == 0

    def test_silent_return_does_not_send_email(self):
        with patch(
            "accounts.services.password_service.send_password_reset_email.delay"
        ) as mock_task:
            request_password_reset(email="nobody@example.com")
            mock_task.assert_not_called()


# ─── Task 8: Password reset confirm ───────────────────────────────────────


class TestConfirmPasswordReset:
    def test_happy_path_changes_password_and_blacklists_tokens(self):
        user = UserFactory(verified=True)

        reset_token = PasswordResetTokenFactory(user=user)

        result = confirm_password_reset(
            token=reset_token.token, new_password="NewSecure456!"
        )

        assert result == user

        reset_token.refresh_from_db()
        assert reset_token.is_used is True

        # old password no longer works
        with pytest.raises(AuthenticationFailed):
            login_user(email=user.email, password="TestPass123!")

        # new password works
        login_user(email=user.email, password="NewSecure456!")

    def test_blacklists_existing_tokens_on_password_reset(self):
        import uuid

        user = UserFactory(verified=True)

        # Create an OutstandingToken that is NOT blacklisted yet
        newer_ot = OutstandingToken.objects.create(
            jti=uuid.uuid4().hex,
            token="fake-token-value",
            user=user,
            created_at=timezone.now(),
            expires_at=timezone.now() + timedelta(days=7),
        )
        assert not BlacklistedToken.objects.filter(token=newer_ot).exists()

        reset_token = PasswordResetTokenFactory(user=user)
        confirm_password_reset(token=reset_token.token, new_password="NewSecure456!")

        assert BlacklistedToken.objects.filter(token=newer_ot).exists()

    def test_raises_on_invalid_token(self):
        with pytest.raises(ValidationError, match="Invalid or expired reset token"):
            confirm_password_reset(token="bad-token", new_password="NewSecure456!")

    def test_raises_on_used_token(self):
        token = PasswordResetTokenFactory(used=True)
        with pytest.raises(ValidationError, match="Invalid or expired reset token"):
            confirm_password_reset(token=token.token, new_password="NewSecure456!")

    def test_raises_on_expired_token(self):
        token = PasswordResetTokenFactory(expired=True)
        with pytest.raises(ValidationError, match="Reset token expired"):
            confirm_password_reset(token=token.token, new_password="NewSecure456!")

    def test_raises_on_weak_password(self):
        token = PasswordResetTokenFactory()
        with pytest.raises(ValidationError):
            confirm_password_reset(token=token.token, new_password="short")

    def test_password_differs_from_old(self):
        user = UserFactory(verified=True)
        old_hash = user.password
        token = PasswordResetTokenFactory(user=user)

        confirm_password_reset(token=token.token, new_password="TotallyNew789!")
        user.refresh_from_db()
        assert user.password != old_hash


# ─── Task 7: Logout / Token refresh (integration via services) ────────────


class TestTokenLifecycle:
    def test_refresh_token_blacklisted_after_use(self):
        user = UserFactory(verified=True)
        _, refresh = login_user(email=user.email, password="TestPass123!")

        from rest_framework_simplejwt.tokens import RefreshToken

        old_token = RefreshToken(refresh)
        old_token.blacklist()

        from rest_framework_simplejwt.exceptions import TokenError

        with pytest.raises(TokenError):
            blacklisted = RefreshToken(refresh)
            blacklisted.check_blacklist()


# ─── Task 9: Profile Read + Update ──────────────────────────────────────────


class TestGetUserProfile:
    def test_returns_user_with_select_related(self):
        user = UserFactory(verified=True)
        from accounts.selectors.user_selectors import get_user_profile

        result = get_user_profile(user_id=user.id)
        assert result.id == user.id
        assert result.full_name == user.full_name


class TestUpdateUserProfile:
    def test_updates_full_name(self):
        user = UserFactory(verified=True)
        from accounts.services.profile_service import update_user_profile

        updated = update_user_profile(user=user, full_name="New Name")
        assert updated.full_name == "New Name"
        user.refresh_from_db()
        assert user.full_name == "New Name"

    def test_updates_phone(self):
        user = UserFactory(verified=True)
        from accounts.services.profile_service import update_user_profile

        updated = update_user_profile(user=user, phone_e164="+919876543210")
        assert updated.phone_e164 == "+919876543210"

    def test_clears_phone(self):
        user = UserFactory(verified=True, phone_e164="+919876543210")
        from accounts.services.profile_service import update_user_profile

        updated = update_user_profile(user=user, phone_e164="")
        assert updated.phone_e164 is None

    def test_raises_on_duplicate_phone(self):
        UserFactory(verified=True, phone_e164="+919999999999")
        user2 = UserFactory(verified=True)
        from accounts.services.profile_service import update_user_profile

        with pytest.raises(ValidationError, match="Phone number already in use"):
            update_user_profile(user=user2, phone_e164="+919999999999")

    def test_updates_preferred_language(self):
        user = UserFactory(verified=True)
        from accounts.services.profile_service import update_user_profile

        updated = update_user_profile(user=user, preferred_language="hi")
        assert updated.preferred_language == "hi"

    def test_updates_target_exam(self):
        exam = ExamFactory()
        user = UserFactory(verified=True)
        from accounts.services.profile_service import update_user_profile

        updated = update_user_profile(user=user, target_exam_id=str(exam.id))
        assert updated.target_exam_id == exam.id

    def test_raises_on_invalid_target_exam(self):
        import uuid

        user = UserFactory(verified=True)
        from accounts.services.profile_service import update_user_profile

        with pytest.raises(ValidationError, match="Exam not found or not active"):
            update_user_profile(
                user=user, target_exam_id=str(uuid.uuid4())
            )

    def test_raises_on_inactive_exam(self):
        exam = InactiveExamFactory()
        user = UserFactory(verified=True)
        from accounts.services.profile_service import update_user_profile

        with pytest.raises(ValidationError, match="Exam not found or not active"):
            update_user_profile(user=user, target_exam_id=str(exam.id))

    def test_clears_target_exam(self):
        exam = ExamFactory()
        user = UserFactory(verified=True, target_exam=exam)
        from accounts.services.profile_service import update_user_profile

        updated = update_user_profile(user=user, target_exam_id=None)
        assert updated.target_exam is None

    def test_updates_exam_date(self):
        from datetime import date

        user = UserFactory(verified=True)
        from accounts.services.profile_service import update_user_profile

        future = date(2027, 6, 1)
        updated = update_user_profile(user=user, exam_date=future.isoformat())
        assert updated.exam_date == future

    def test_clears_exam_date(self):
        from datetime import date

        exam = ExamFactory()
        user = UserFactory(verified=True, target_exam=exam, exam_date=date(2027, 6, 1))
        from accounts.services.profile_service import update_user_profile

        updated = update_user_profile(user=user, exam_date=None)
        assert updated.exam_date is None

    def test_no_op_when_no_fields_provided(self):
        user = UserFactory(verified=True, full_name="Original Name")
        from accounts.services.profile_service import update_user_profile

        updated = update_user_profile(user=user)
        assert updated.full_name == "Original Name"

    def test_only_specified_fields_updated(self):
        user = UserFactory(
            verified=True,
            full_name="Original",
            preferred_language="as",
        )
        from accounts.services.profile_service import update_user_profile

        updated = update_user_profile(user=user, full_name="Changed")
        updated.refresh_from_db()
        assert updated.full_name == "Changed"
        assert updated.preferred_language == "as"


# ─── Task 11: Permission Classes ──────────────────────────────────────────


class TestHasRole:
    def test_allows_user_with_matching_role(self):
        role = RoleFactory(name="content_manager")
        user = UserFactory()
        UserRoleFactory(user=user, role=role)
        permission = HasRole.for_roles("content_manager")()
        request = APIRequestFactory().get("/")
        request.user = user
        assert permission.has_permission(request, view=MagicMock()) is True

    def test_denies_user_without_matching_role(self):
        role = RoleFactory(name="content_manager")
        user = UserFactory()
        UserRoleFactory(user=user, role=role)
        permission = HasRole.for_roles("platform_admin")()
        request = APIRequestFactory().get("/")
        request.user = user
        assert permission.has_permission(request, view=MagicMock()) is False

    def test_denies_unauthenticated(self):
        permission = HasRole.for_roles("student")()
        request = APIRequestFactory().get("/")
        request.user = AnonymousUser()
        assert permission.has_permission(request, view=MagicMock()) is False


class TestIsStudent:
    def test_allows_student(self):
        role = RoleFactory(name="student")
        user = UserFactory()
        UserRoleFactory(user=user, role=role)
        permission = IsStudent()
        request = APIRequestFactory().get("/")
        request.user = user
        assert permission.has_permission(request, view=MagicMock()) is True

    def test_denies_non_student(self):
        role = RoleFactory(name="teacher")
        user = UserFactory()
        UserRoleFactory(user=user, role=role)
        permission = IsStudent()
        request = APIRequestFactory().get("/")
        request.user = user
        assert permission.has_permission(request, view=MagicMock()) is False

    def test_denies_unauthenticated(self):
        permission = IsStudent()
        request = APIRequestFactory().get("/")
        request.user = AnonymousUser()
        assert permission.has_permission(request, view=MagicMock()) is False


class TestIsPlatformAdmin:
    def test_allows_superuser(self):
        user = UserFactory(is_superuser=True, verified=True)
        permission = IsPlatformAdmin()
        request = APIRequestFactory().get("/")
        request.user = user
        assert permission.has_permission(request, view=MagicMock()) is True

    def test_allows_platform_admin_role(self):
        role = RoleFactory(name="platform_admin")
        user = UserFactory()
        UserRoleFactory(user=user, role=role)
        permission = IsPlatformAdmin()
        request = APIRequestFactory().get("/")
        request.user = user
        assert permission.has_permission(request, view=MagicMock()) is True

    def test_denies_regular_user(self):
        user = UserFactory(verified=True)
        permission = IsPlatformAdmin()
        request = APIRequestFactory().get("/")
        request.user = user
        assert permission.has_permission(request, view=MagicMock()) is False

    def test_denies_unauthenticated(self):
        permission = IsPlatformAdmin()
        request = APIRequestFactory().get("/")
        request.user = AnonymousUser()
        assert permission.has_permission(request, view=MagicMock()) is False


class TestIsInstitutionScoped:
    def test_allows_user_with_matching_institution(self):
        import uuid

        inst_id = uuid.uuid4()
        role = RoleFactory(name="teacher")
        user = UserFactory()
        UserRoleFactory(user=user, role=role, institution_id=inst_id)
        permission = IsInstitutionScoped()
        request = APIRequestFactory().get("/")
        request.user = user
        view = MagicMock()
        view.kwargs = {"institution_id": str(inst_id)}
        assert permission.has_permission(request, view=view) is True

    def test_denies_user_without_matching_institution(self):
        import uuid

        inst_id = uuid.uuid4()
        role = RoleFactory(name="teacher")
        user = UserFactory()
        UserRoleFactory(user=user, role=role, institution_id=inst_id)
        permission = IsInstitutionScoped()
        request = APIRequestFactory().get("/")
        request.user = user
        view = MagicMock()
        view.kwargs = {"institution_id": str(uuid.uuid4())}
        assert permission.has_permission(request, view=view) is False

    def test_denies_unauthenticated(self):
        permission = IsInstitutionScoped()
        request = APIRequestFactory().get("/")
        request.user = AnonymousUser()
        assert permission.has_permission(request, view=MagicMock()) is False


# ─── Task 11: seed_roles command ──────────────────────────────────────────


class TestSeedRolesCommand:
    def test_seeds_roles_and_permissions_idempotently(self):
        from io import StringIO

        from django.core.management import call_command

        out = StringIO()
        call_command("seed_roles", stdout=out)
        first_output = out.getvalue()

        assert Role.objects.count() == 7
        assert Permission.objects.count() == 14

        for role in Role.objects.all():
            assert role.is_system is True

        out2 = StringIO()
        call_command("seed_roles", stdout=out2)
        second_output = out2.getvalue()

        assert Role.objects.count() == 7
        assert Permission.objects.count() == 14

        assert "Created" in first_output
        assert "Done" in first_output


# ─── Task 10: Data Export + Account Deletion (DPDP) ────────────────────────


class TestRequestDataExport:
    @patch("accounts.services.dpdp_service.export_user_data_async.delay")
    def test_enqueues_export_task(self, mock_delay):
        user = UserFactory(verified=True)
        from accounts.services.dpdp_service import request_data_export

        request_data_export(user=user)
        mock_delay.assert_called_once_with(str(user.id))


class TestDeleteAccount:
    def test_anonymizes_pii(self):
        user = UserFactory(
            verified=True,
            full_name="Jane Doe",
            phone_e164="+919876543210",
        )
        from accounts.services.dpdp_service import delete_account

        delete_account(user=user, password="TestPass123!")
        user.refresh_from_db()
        assert user.status == "deleted"
        assert user.full_name == "Deleted User"
        assert user.phone_e164 is None
        assert user.email.startswith("deleted_")
        assert user.email.endswith("@deleted.prepgenius.invalid")
        assert user.deleted_at is not None
        assert user.is_active is False

    def test_password_becomes_unusable(self):
        user = UserFactory(verified=True)
        from accounts.services.dpdp_service import delete_account

        delete_account(user=user, password="TestPass123!")
        user.refresh_from_db()
        assert not user.has_usable_password()
        assert not user.check_password("TestPass123!")

    def test_raises_on_wrong_password(self):
        user = UserFactory(verified=True)
        from accounts.services.dpdp_service import delete_account

        with pytest.raises(ValidationError, match="Incorrect password"):
            delete_account(user=user, password="wrong")

    def test_user_cannot_login_after_deletion(self):
        user = UserFactory(verified=True)
        from accounts.services.dpdp_service import delete_account

        delete_account(user=user, password="TestPass123!")
        from accounts.services.auth_service import login_user

        with pytest.raises(AuthenticationFailed):
            login_user(email=user.email, password="TestPass123!")

    def test_deletes_verification_tokens(self):
        user = UserFactory(verified=True)
        EmailVerificationTokenFactory(user=user)
        EmailVerificationTokenFactory(user=user)
        assert EmailVerificationToken.objects.filter(user=user).count() == 2
        from accounts.services.dpdp_service import delete_account

        delete_account(user=user, password="TestPass123!")
        assert EmailVerificationToken.objects.filter(user=user).count() == 0

    def test_deletes_password_reset_tokens(self):
        user = UserFactory(verified=True)
        PasswordResetTokenFactory(user=user)
        assert PasswordResetToken.objects.filter(user=user).count() == 1
        from accounts.services.dpdp_service import delete_account

        delete_account(user=user, password="TestPass123!")
        assert PasswordResetToken.objects.filter(user=user).count() == 0

    def test_blacklists_jwt_tokens(self):
        from rest_framework_simplejwt.token_blacklist.models import (
            BlacklistedToken,
            OutstandingToken,
        )

        user = UserFactory(verified=True)
        from accounts.services.auth_service import login_user

        login_user(email=user.email, password="TestPass123!")
        outstanding_count = OutstandingToken.objects.filter(user=user).count()
        assert outstanding_count > 0

        from accounts.services.dpdp_service import delete_account

        delete_account(user=user, password="TestPass123!")

        # Outstanding tokens are KEPT (deleting them would CASCADE-delete the
        # blacklist entries). What matters is that they are blacklisted.
        blacklisted_count = BlacklistedToken.objects.filter(
            token__user=user
        ).count()
        assert blacklisted_count == outstanding_count

    def test_retains_consent_records(self):
        user = UserFactory(verified=True)
        UserConsentFactory(user=user)
        from accounts.services.dpdp_service import delete_account

        delete_account(user=user, password="TestPass123!")
        from accounts.models import UserConsent

        assert UserConsent.objects.filter(user=user).exists()
