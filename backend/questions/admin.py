from django import forms
from django.contrib import admin, messages

from questions.exceptions import (
    ApprovalRequiredForPublishError,
    InvalidReviewTransitionError,
    QuestionDomainError,
)
from questions.services.question_services import (
    assert_publish_allowed,
    assert_valid_review_transition,
    update_question_review_status,
)

from .models import (
    AiGeneratedQuestion,
    Question,
    QuestionAppearance,
    QuestionOption,
    QuestionStat,
)


def _actor_role_for(user) -> str | None:
    """Best-effort role label for the content_reviews audit trail."""
    if getattr(user, "is_superuser", False):
        return "platform_admin"
    from accounts.models import UserRole

    return (
        UserRole.objects.filter(user=user)
        .values_list("role__name", flat=True)
        .first()
    )


class QuestionAdminForm(forms.ModelForm):
    """PH-3: enforce the review state machine + publish policy in the admin.

    Blocks direct status edits that bypass approval — an illegal transition
    (e.g. draft → published) or a publish that fails the configured review
    policy is rejected with a form error rather than written to the DB.
    """

    class Meta:
        model = Question
        # `embedding` (pgvector) is a readonly admin field, never form-editable.
        exclude = ("embedding",)

    def clean(self) -> dict:
        cleaned = super().clean()
        new_status = cleaned.get("review_status")
        old_status = (
            self.instance.review_status
            if self.instance and self.instance.pk
            else "draft"
        )
        if new_status and new_status != old_status:
            try:
                assert_valid_review_transition(old_status, new_status)
            except InvalidReviewTransitionError as exc:
                raise forms.ValidationError({"review_status": str(exc)})
            if new_status == "published":
                try:
                    assert_publish_allowed(self.instance)
                except ApprovalRequiredForPublishError as exc:
                    raise forms.ValidationError({"review_status": str(exc)})
        return cleaned


class QuestionOptionInline(admin.TabularInline):
    model = QuestionOption
    extra = 1
    fields = ["label", "body", "is_correct", "position"]


class QuestionAppearanceInline(admin.TabularInline):
    model = QuestionAppearance
    extra = 1
    fields = ["paper", "year"]


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    form = QuestionAdminForm
    list_display = [
        "id_short",
        "exam",
        "subtopic",
        "difficulty",
        "origin",
        "review_status",
        "language",
        "created_at",
    ]
    list_filter = [
        "exam",
        "origin",
        "review_status",
        "difficulty",
        "language",
    ]
    search_fields = ["stem", "exam__code"]
    readonly_fields = ["id", "embedding", "created_at", "updated_at"]
    raw_id_fields = ["subtopic", "verified_by"]
    fieldsets = [
        (
            None,
            {
                "fields": [
                    "exam",
                    "subtopic",
                    "stem",
                    "explanation",
                    "difficulty",
                    "language",
                ]
            },
        ),
        (
            "Tracking",
            {
                "fields": [
                    "origin",
                    "review_status",
                    "verified_by",
                    "tags",
                    "embedding",
                ]
            },
        ),
        ("Timestamps", {"fields": ["id", "created_at", "updated_at"]}),
    ]
    inlines = [QuestionOptionInline, QuestionAppearanceInline]

    def save_model(self, request, obj, form, change) -> None:
        """Route review_status changes through the guarded service so the
        transition graph, publish policy, and content_reviews audit trail are
        applied — a raw field write would bypass all three. Other field edits
        are persisted normally."""
        status_changed = change and "review_status" in form.changed_data
        if not status_changed:
            super().save_model(request, obj, form, change)
            return

        new_status = obj.review_status
        # Persist any other edits without touching the status field directly.
        obj.review_status = form.initial.get("review_status", new_status)
        super().save_model(request, obj, form, change)

        try:
            update_question_review_status(
                question_id=obj.pk,
                review_status=new_status,
                actor_id=request.user.id,
                actor_role=_actor_role_for(request.user),
                comment="Status changed via Django Admin",
            )
        except QuestionDomainError as exc:
            # The form's clean() already validated this, so this is a defensive
            # backstop (e.g. an approval removed between clean and save).
            self.message_user(request, str(exc), level=messages.ERROR)
            return
        obj.refresh_from_db()

    @admin.display(description="ID")
    def id_short(self, obj: Question) -> str:
        return str(obj.id)[:8]


@admin.register(QuestionOption)
class QuestionOptionAdmin(admin.ModelAdmin):
    list_display = ["question", "label", "body_short", "is_correct", "position"]
    list_filter = ["is_correct"]
    search_fields = ["question__stem", "body"]
    raw_id_fields = ["question"]

    @admin.display(description="Body")
    def body_short(self, obj: QuestionOption) -> str:
        return obj.body[:60]


@admin.register(QuestionAppearance)
class QuestionAppearanceAdmin(admin.ModelAdmin):
    list_display = ["question", "paper", "year"]
    list_filter = ["year"]
    raw_id_fields = ["question", "paper"]


@admin.register(QuestionStat)
class QuestionStatAdmin(admin.ModelAdmin):
    list_display = ["question", "attempts", "correct", "success_rate", "avg_time_seconds"]
    readonly_fields = ["question"]
    raw_id_fields = ["question"]


@admin.register(AiGeneratedQuestion)
class AiGeneratedQuestionAdmin(admin.ModelAdmin):
    list_display = [
        "id_short",
        "exam",
        "model_used",
        "status",
        "credits_charged",
        "created_at",
    ]
    list_filter = ["exam", "status", "model_used"]
    readonly_fields = [
        "id",
        "prompt",
        "raw_output",
        "constraints_snapshot",
        "validation",
        "created_at",
    ]
    raw_id_fields = ["subtopic", "resulting_question"]

    @admin.display(description="ID")
    def id_short(self, obj: AiGeneratedQuestion) -> str:
        return str(obj.id)[:8]
