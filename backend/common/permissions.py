from rest_framework.permissions import BasePermission, SAFE_METHODS

from accounts.models import UserRole

READ_ROLES = {
    "student",
    "teacher",
    "content_manager",
    "content_reviewer",
    "sme",
    "institution_admin",
    "platform_admin",
}

WRITE_ROLES = {"content_manager", "platform_admin"}

ACTIVATE_ROLES = {"platform_admin"}

CONTENT_REVIEW_VIEW_ROLES = {
    "content_reviewer",
    "sme",
    "content_manager",
    "platform_admin",
}

CONTENT_REVIEW_WRITE_ROLES = {
    "content_reviewer",
    "content_manager",
    "platform_admin",
}

CONTENT_PUBLISH_ROLES = {
    "content_manager",
    "platform_admin",
}

CONTENT_SME_APPROVE_ROLES = {
    "sme",
    "platform_admin",
}

CONTENT_REJECT_ROLES = {
    "content_reviewer",
    "sme",
    "content_manager",
    "platform_admin",
}

# Operator roles allowed to generate AI draft questions (content creators only —
# never students/teachers). Mirrors the content-creation write roles; AI output is
# always Draft and still passes human review before publish (PRD §8).
AI_GENERATE_ROLES = {
    "content_manager",
    "platform_admin",
}


class IsAuthenticatedReadOnly(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return UserRole.objects.filter(
                user=request.user, role__name__in=READ_ROLES
            ).exists()
        return UserRole.objects.filter(
            user=request.user, role__name__in=WRITE_ROLES
        ).exists()


class CanManageExamConfiguration(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return UserRole.objects.filter(
            user=request.user, role__name__in=WRITE_ROLES
        ).exists()


class CanActivateDeactivateExam(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return UserRole.objects.filter(
            user=request.user, role__name__in=ACTIVATE_ROLES
        ).exists()


class CanViewContentReview(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return UserRole.objects.filter(
            user=request.user,
            role__name__in=CONTENT_REVIEW_VIEW_ROLES,
        ).exists()


class CanClaimQuestion(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return UserRole.objects.filter(
            user=request.user,
            role__name__in=CONTENT_REVIEW_WRITE_ROLES,
        ).exists()


class CanReleaseClaim(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return UserRole.objects.filter(
            user=request.user,
            role__name__in=CONTENT_PUBLISH_ROLES,
        ).exists()


class CanApproveReviewerLevel(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return UserRole.objects.filter(
            user=request.user,
            role__name__in=CONTENT_REVIEW_WRITE_ROLES,
        ).exists()


class CanApproveSmeLevel(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return UserRole.objects.filter(
            user=request.user,
            role__name__in=CONTENT_SME_APPROVE_ROLES,
        ).exists()


class CanPublishContent(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return UserRole.objects.filter(
            user=request.user,
            role__name__in=CONTENT_PUBLISH_ROLES,
        ).exists()


class CanRequestSmeReview(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return UserRole.objects.filter(
            user=request.user,
            role__name__in=CONTENT_REVIEW_WRITE_ROLES,
        ).exists()


class CanRejectContent(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return UserRole.objects.filter(
            user=request.user,
            role__name__in=CONTENT_REJECT_ROLES,
        ).exists()


class CanGenerateAiQuestions(BasePermission):
    """Operator-only access to AI question generation (no student/teacher)."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return UserRole.objects.filter(
            user=request.user,
            role__name__in=AI_GENERATE_ROLES,
        ).exists()
