from django.contrib import admin

from .models import (
    AiGeneratedQuestion,
    Question,
    QuestionAppearance,
    QuestionOption,
    QuestionStat,
)


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
