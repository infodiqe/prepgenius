from django.contrib import admin

from attempts.models import ExamAttempt, MockTest, MockTestQuestion, UserAnswer


class MockTestQuestionInline(admin.TabularInline):
    model = MockTestQuestion
    extra = 1
    fields = ["question", "position", "section", "marks"]


@admin.register(MockTest)
class MockTestAdmin(admin.ModelAdmin):
    list_display = ["name", "exam", "type", "is_published", "total_questions", "duration_seconds"]
    list_filter = ["type", "is_published", "exam"]
    search_fields = ["name"]
    inlines = [MockTestQuestionInline]


@admin.register(MockTestQuestion)
class MockTestQuestionAdmin(admin.ModelAdmin):
    list_display = ["mock_test", "question", "position", "section", "marks"]
    list_filter = ["mock_test__exam"]


@admin.register(ExamAttempt)
class ExamAttemptAdmin(admin.ModelAdmin):
    list_display = [
        "user", "exam", "attempt_type", "status",
        "score", "accuracy", "created_at",
    ]
    list_filter = ["status", "attempt_type", "exam"]
    search_fields = ["user__email", "user__full_name"]
    readonly_fields = [
        "id", "created_at", "updated_at",
        "score", "max_score", "correct", "incorrect",
        "skipped", "accuracy", "time_taken_seconds",
    ]


@admin.register(UserAnswer)
class UserAnswerAdmin(admin.ModelAdmin):
    list_display = ["id", "attempt", "question", "state", "is_correct"]
    list_filter = ["state"]
    readonly_fields = ["id", "created_at"]
