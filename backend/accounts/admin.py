from django import forms
from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.password_validation import validate_password
from django.utils.translation import gettext_lazy as _

from accounts.services.dpdp_service import anonymize_user

from .models import (
    EmailVerificationToken,
    PasswordResetToken,
    Permission,
    Role,
    RolePermission,
    User,
    UserConsent,
    UserRole,
)


# ─── Custom add-user form ─────────────────────────────────────────────────────


class AdminUserCreationForm(forms.ModelForm):
    """
    Standalone user-creation form for the admin.
    Handles password hashing so the admin can create users with
    ``email`` and ``full_name`` (instead of the unused ``username`` field).
    """

    password1 = forms.CharField(
        label=_("Password"),
        widget=forms.PasswordInput,
        strip=False,
    )
    password2 = forms.CharField(
        label=_("Password confirmation"),
        widget=forms.PasswordInput,
        strip=False,
    )

    class Meta:
        model = User
        fields = ("email", "full_name")

    def clean_password2(self):
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError(
                _("The two password fields didn't match."),
            )
        validate_password(password2, self.instance)
        return password2

    def save(self, commit: bool = True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
        return user


# ─── Inlines ──────────────────────────────────────────────────────────────────


class RolePermissionInline(admin.TabularInline):
    """Inline for Role-Permission assignments inside RoleAdmin."""

    model = RolePermission
    extra = 1
    autocomplete_fields = ["permission"]


# ─── User ─────────────────────────────────────────────────────────────────────


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        "email",
        "full_name",
        "status",
        "preferred_language",
        "is_email_verified",
        "is_minor",
        "created_at",
    )
    list_filter = (
        "status",
        "preferred_language",
        "is_email_verified",
        "is_minor",
        "is_staff",
    )
    search_fields = ("email", "full_name", "phone_e164")
    readonly_fields = ("id", "created_at", "updated_at", "deleted_at", "last_login")
    ordering = ("-created_at",)
    actions = ("anonymize_and_deactivate",)

    # ── Custom creation form adds email + full_name ───────────────────────────
    add_form = AdminUserCreationForm

    # ── DPDP compliance: no hard delete from the admin ────────────────────────
    def has_delete_permission(self, request, obj=None) -> bool:
        """Hard delete is disabled (PRD §22 / ADMIN-HARDEN-02 / P0).

        Hard-deleting a user would destroy PII that DPDP requires us to
        anonymize-and-retain and could cascade into audit/history rows. Operators
        must use the "Anonymize and Deactivate" action instead, which soft-deletes
        via the shared DPDP service.
        """
        return False

    @admin.action(description=_("Anonymize and Deactivate (DPDP)"))
    def anonymize_and_deactivate(self, request, queryset) -> None:
        """Soft-delete selected users via the shared DPDP anonymization service.

        Anonymizes PII, sets status="deleted" + deleted_at, deactivates the
        account, and revokes sessions — while preserving the user row (and the
        audit/history that references it). Already-deleted users are skipped.
        """
        anonymized = 0
        skipped = 0
        for user in queryset:
            if user.status == "deleted":
                skipped += 1
                continue
            anonymize_user(user=user)
            anonymized += 1

        if anonymized:
            self.message_user(
                request,
                _("%(n)d user(s) anonymized and deactivated.")
                % {"n": anonymized},
                level=messages.SUCCESS,
            )
        if skipped:
            self.message_user(
                request,
                _("%(n)d already-deleted user(s) skipped.") % {"n": skipped},
                level=messages.WARNING,
            )

    fieldsets = (
        (None, {"fields": ("email", "full_name", "phone_e164", "status")}),
        (_("Exam"), {"fields": ("target_exam", "exam_date")}),
        (_("Preferences"), {"fields": ("preferred_language", "is_minor")}),
        (
            _("Verification"),
            {"fields": ("is_email_verified", "is_phone_verified")},
        ),
        (
            _("Permissions"),
            {
                "fields": (
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        (
            _("Timestamps"),
            {
                "fields": (
                    "created_at",
                    "updated_at",
                    "deleted_at",
                    "last_login",
                ),
            },
        ),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "full_name", "password1", "password2"),
            },
        ),
    )


# ─── Role + Permission ────────────────────────────────────────────────────────


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "is_system", "created_at")
    search_fields = ("name",)
    readonly_fields = ("id", "created_at")
    inlines = [RolePermissionInline]


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ("code", "description")
    search_fields = ("code", "description")
    readonly_fields = ("id",)


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "institution_id", "granted_at")
    list_filter = ("role",)
    search_fields = ("user__email",)
    readonly_fields = ("granted_at",)
    raw_id_fields = ("user",)


# ─── Consent ──────────────────────────────────────────────────────────────────


@admin.register(UserConsent)
class UserConsentAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "purpose",
        "consent_version",
        "granted",
        "is_parental",
        "granted_at",
    )
    list_filter = ("purpose", "granted", "is_parental")
    search_fields = ("user__email",)
    readonly_fields = ("id", "granted_at", "ip_address")
    raw_id_fields = ("user",)


# ─── Tokens (read-only in admin) ──────────────────────────────────────────────


@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "is_used", "expires_at", "created_at")
    list_filter = ("is_used",)
    raw_id_fields = ("user",)
    readonly_fields = ("id", "token", "created_at")


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "is_used", "expires_at", "created_at")
    list_filter = ("is_used",)
    raw_id_fields = ("user",)
    readonly_fields = ("id", "token", "created_at")
