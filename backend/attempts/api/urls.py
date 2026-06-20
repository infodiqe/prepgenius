from django.urls import path

from attempts.api.views import (
    AttemptDetail,
    AttemptList,
    AttemptScore,
    AttemptStart,
    AttemptSubmit,
    MockTestDetail,
    MockTestList,
    MockTestQuestionDetail,
    MockTestQuestionList,
    PracticeAttemptCreate,
    UserAnswerBulkSave,
    UserAnswerList,
    UserAnswerSave,
)
from analytics.api.views import AttemptResultsView, AttemptAnalyticsView

app_name = "attempts"

urlpatterns = [
    # Mock Tests
    path("mock-tests/", MockTestList.as_view(), name="mock-test-list"),
    path(
        "mock-tests/<uuid:pk>/",
        MockTestDetail.as_view(),
        name="mock-test-detail",
    ),
    # Mock Test Questions
    path(
        "mock-tests/<uuid:mock_test_pk>/questions/",
        MockTestQuestionList.as_view(),
        name="mock-test-question-list",
    ),
    path(
        "mock-test-questions/<uuid:pk>/",
        MockTestQuestionDetail.as_view(),
        name="mock-test-question-detail",
    ),
    # Attempts
    path("attempts/", AttemptList.as_view(), name="attempt-list"),
    path(
        "attempts/practice/",
        PracticeAttemptCreate.as_view(),
        name="practice-attempt-create",
    ),
    path(
        "attempts/<uuid:pk>/",
        AttemptDetail.as_view(),
        name="attempt-detail",
    ),
    path(
        "attempts/<uuid:pk>/start/",
        AttemptStart.as_view(),
        name="attempt-start",
    ),
    path(
        "attempts/<uuid:pk>/submit/",
        AttemptSubmit.as_view(),
        name="attempt-submit",
    ),
    path(
        "attempts/<uuid:pk>/score/",
        AttemptScore.as_view(),
        name="attempt-score",
    ),
    path(
        "attempts/<uuid:pk>/results/",
        AttemptResultsView.as_view(),
        name="attempt-results",
    ),
    path(
        "attempts/<uuid:pk>/analytics/",
        AttemptAnalyticsView.as_view(),
        name="attempt-analytics",
    ),
    # Answers
    path(
        "attempts/<uuid:attempt_pk>/answers/",
        UserAnswerList.as_view(),
        name="answer-list",
    ),
    path(
        "attempts/<uuid:attempt_pk>/answers/save/",
        UserAnswerSave.as_view(),
        name="answer-save",
    ),
    path(
        "attempts/<uuid:attempt_pk>/answers/bulk-save/",
        UserAnswerBulkSave.as_view(),
        name="answer-bulk-save",
    ),
]
