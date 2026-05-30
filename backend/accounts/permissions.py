from rest_framework.permissions import BasePermission

from accounts.models.rbac import PLATFORM_ADMIN, STUDENT
from accounts.models import UserRole


class HasRole(BasePermission):
    roles: set[str] = set()

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        return UserRole.objects.filter(
            user=request.user,
            role__name__in=self.roles,
        ).exists()

    @classmethod
    def for_roles(cls, *roles: str) -> type["HasRole"]:
        return type(
            f"HasRole_{'_'.join(roles)}",
            (cls,),
            {"roles": set(roles)},
        )


class IsStudent(BasePermission):
    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        return UserRole.objects.filter(
            user=request.user,
            role__name=STUDENT,
        ).exists()


class IsPlatformAdmin(BasePermission):
    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        return UserRole.objects.filter(
            user=request.user,
            role__name=PLATFORM_ADMIN,
        ).exists()


class IsInstitutionScoped(BasePermission):
    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        institution_id = (
            view.kwargs.get("institution_id")
            or request.data.get("institution_id")
        )
        if not institution_id:
            return False
        return UserRole.objects.filter(
            user=request.user,
            institution_id=institution_id,
        ).exists()
