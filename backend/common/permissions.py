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
