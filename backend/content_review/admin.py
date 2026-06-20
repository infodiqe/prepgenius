from django.contrib import admin

from .models import ContentApproval, ContentReview


class _ViewOnlyAdmin(admin.ModelAdmin):
    """Base for content-trust audit records that must be view-only in the admin.

    ContentReview is an append-only audit trail and ContentApproval is the
    provenance of human sign-off — both are written exclusively through the
    content_review service layer (ADMIN-HARDEN-02 / P0). The admin therefore
    permits listing, filtering, searching, and read-only detail viewing, but
    never manual creation, editing, or deletion (which would let an operator
    forge or erase the audit/approval history).
    """

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        # View permission is unaffected, so detail pages still render read-only.
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False


@admin.register(ContentReview)
class ContentReviewAdmin(_ViewOnlyAdmin):
    list_display = [
        "id",
        "question",
        "action",
        "from_status",
        "to_status",
        "actor",
        "created_at",
    ]
    list_filter = ["action", "from_status", "to_status"]
    search_fields = ["actor__email"]
    readonly_fields = ["id", "created_at"]
    raw_id_fields = ["question", "ai_generated_question", "actor"]


@admin.register(ContentApproval)
class ContentApprovalAdmin(_ViewOnlyAdmin):
    list_display = ["question", "approval_level", "approver", "approved_at"]
    list_filter = ["approval_level"]
    raw_id_fields = ["question", "approver"]
    readonly_fields = ["approved_at"]
