from django.contrib import admin

from .models import Exam, PreviousYearPaper, Subject, Subtopic, SyllabusItem, Topic


class SubjectInline(admin.TabularInline):
    model = Subject
    extra = 1
    fields = ["name", "position"]


class SyllabusItemInline(admin.TabularInline):
    model = SyllabusItem
    extra = 1
    fields = ["title", "topic", "subtopic", "weightage", "position"]


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = [
        "code",
        "name",
        "exam_type",
        "is_active",
        "audience_is_minor",
        "created_at",
    ]
    list_filter = ["exam_type", "is_active", "audience_is_minor"]
    search_fields = ["code", "name"]
    readonly_fields = ["id", "created_at", "updated_at"]
    fieldsets = [
        (
            None,
            {
                "fields": [
                    "code",
                    "name",
                    "exam_type",
                    "is_active",
                    "audience_is_minor",
                ]
            },
        ),
        (
            "Configuration",
            {
                "fields": [
                    "difficulty_levels",
                    "exam_rules",
                    "blueprint",
                    "passing_criteria",
                    "analytics_rules",
                ]
            },
        ),
        ("Timestamps", {"fields": ["id", "created_at", "updated_at"]}),
    ]
    inlines = [SubjectInline, SyllabusItemInline]


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ["name", "exam", "position"]
    list_filter = ["exam"]
    search_fields = ["name", "exam__code"]
    readonly_fields = ["id"]


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ["name", "subject", "position"]
    list_filter = ["subject__exam", "subject"]
    search_fields = ["name", "subject__name"]
    readonly_fields = ["id"]


@admin.register(Subtopic)
class SubtopicAdmin(admin.ModelAdmin):
    list_display = ["name", "topic", "position"]
    list_filter = ["topic__subject__exam", "topic__subject"]
    search_fields = ["name", "topic__name"]
    readonly_fields = ["id"]


@admin.register(SyllabusItem)
class SyllabusItemAdmin(admin.ModelAdmin):
    list_display = ["title", "exam", "topic", "weightage", "position"]
    list_filter = ["exam"]
    search_fields = ["title", "exam__code"]
    readonly_fields = ["id"]


@admin.register(PreviousYearPaper)
class PreviousYearPaperAdmin(admin.ModelAdmin):
    list_display = ["code", "exam", "year", "language", "total_questions"]
    list_filter = ["exam", "language", "year"]
    search_fields = ["code", "exam__code"]
    readonly_fields = ["id", "created_at"]
