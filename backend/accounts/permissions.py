from rest_framework.permissions import BasePermission

from accounts.models.rbac import CONTENT_MANAGER, PLATFORM_ADMIN, STUDENT
from accounts.models import UserRole

# OPS-BE-01 — roles permitted to use the read-only Operations User 360 APIs.
# `platform_admin` and `content_manager` exist in the canonical seed today;
# `support` and `operations` are referenced by name so access activates
# automatically once those roles are seeded (seeding them platform-wide is a
# separate RBAC concern and is intentionally NOT done here — it would change the
# canonical role-seed contract). Matched by name through the existing `HasRole`
# machinery — no parallel permission system.
SUPPORT = "support"
OPERATIONS = "operations"
OPS_USER_MANAGEMENT_ROLES = {PLATFORM_ADMIN, CONTENT_MANAGER, SUPPORT, OPERATIONS}


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


class IsOpsUserViewer(HasRole):
    """
    Read access to the Operations Platform User 360 APIs (OPS-BE-01).

    Reuses ``HasRole`` (RBAC). Authorization is role-based only — no superuser
    bypass — so the access surface is exactly the four named operational roles.
    """

    roles = OPS_USER_MANAGEMENT_ROLES


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
