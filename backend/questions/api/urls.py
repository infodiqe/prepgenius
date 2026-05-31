from django.urls import path

from questions.api.views import (
    AiGeneratedDetail,
    AiGeneratedList,
    AiGeneratedPromote,
    PublishedQuestionBySubtopic,
    PublishedQuestionDetail,
    PublishedQuestionList,
    QuestionAppearanceCreate,
    QuestionAppearanceDelete,
    QuestionAppearanceList,
    QuestionDetail,
    QuestionList,
    QuestionOptionCreate,
    QuestionOptionDetail,
    QuestionOptionList,
    QuestionStatsDetail,
)

app_name = "questions"

urlpatterns = [
    # Questions (content-management)
    path("questions/", QuestionList.as_view(), name="question-list"),
    path(
        "questions/<uuid:pk>/", QuestionDetail.as_view(), name="question-detail"
    ),
    # Questions (learner)
    path(
        "questions/published/",
        PublishedQuestionList.as_view(),
        name="published-question-list",
    ),
    path(
        "questions/published/<uuid:pk>/",
        PublishedQuestionDetail.as_view(),
        name="published-question-detail",
    ),
    path(
        "questions/published/by-subtopic/<uuid:subtopic_id>/",
        PublishedQuestionBySubtopic.as_view(),
        name="published-question-by-subtopic",
    ),
    # Options
    path(
        "questions/<uuid:question_pk>/options/",
        QuestionOptionList.as_view(),
        name="question-option-list",
    ),
    path(
        "options/create/",
        QuestionOptionCreate.as_view(),
        name="question-option-create",
    ),
    path(
        "options/<uuid:pk>/",
        QuestionOptionDetail.as_view(),
        name="question-option-detail",
    ),
    # Appearances
    path(
        "questions/<uuid:question_pk>/appearances/",
        QuestionAppearanceList.as_view(),
        name="question-appearance-list",
    ),
    path(
        "appearances/create/",
        QuestionAppearanceCreate.as_view(),
        name="question-appearance-create",
    ),
    path(
        "appearances/<uuid:pk>/",
        QuestionAppearanceDelete.as_view(),
        name="question-appearance-delete",
    ),
    # Stats
    path(
        "questions/<uuid:question_pk>/stats/",
        QuestionStatsDetail.as_view(),
        name="question-stats-detail",
    ),
    # AI Generations
    path(
        "ai-generations/",
        AiGeneratedList.as_view(),
        name="ai-generation-list",
    ),
    path(
        "ai-generations/<uuid:pk>/",
        AiGeneratedDetail.as_view(),
        name="ai-generation-detail",
    ),
    path(
        "ai-generations/<uuid:pk>/promote/",
        AiGeneratedPromote.as_view(),
        name="ai-generation-promote",
    ),
]
