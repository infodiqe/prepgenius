from django.contrib import admin

from .models import ContentApproval, ContentReview


@admin.register(ContentReview)
class ContentReviewAdmin(admin.ModelAdmin):
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
class ContentApprovalAdmin(admin.ModelAdmin):
    list_display = ["question", "approval_level", "approver", "approved_at"]
    list_filter = ["approval_level"]
    raw_id_fields = ["question", "approver"]
    readonly_fields = ["approved_at"]
