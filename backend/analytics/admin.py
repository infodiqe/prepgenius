from django.contrib import admin

from .models import (
    AttemptSectionAnalytics,
    ExamReadinessScore,
    UserTopicPerformance,
    WeakTopic,
)


@admin.register(AttemptSectionAnalytics)
class AttemptSectionAnalyticsAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "attempt",
        "scope_type",
        "scope_id",
        "total",
        "correct",
        "accuracy",
        "avg_time",
    )
    list_filter = ("scope_type",)
    search_fields = ("attempt__id", "scope_id")


@admin.register(UserTopicPerformance)
class UserTopicPerformanceAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "exam",
        "topic",
        "attempts",
        "correct",
        "success_rate",
        "avg_time",
        "last_practiced_at",
    )
    list_filter = ("exam",)
    search_fields = ("user__email", "topic__name")


@admin.register(WeakTopic)
class WeakTopicAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "exam",
        "topic",
        "accuracy",
        "severity",
        "status",
        "detected_at",
    )
    list_filter = ("exam", "status", "severity")
    search_fields = ("user__email", "topic__name")


@admin.register(ExamReadinessScore)
class ExamReadinessScoreAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "exam", "score", "computed_at")
    list_filter = ("exam",)
    search_fields = ("user__email",)
