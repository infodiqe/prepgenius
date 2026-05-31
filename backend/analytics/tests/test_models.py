import pytest
from django.db import IntegrityError

from analytics.models import (
    AttemptSectionAnalytics,
    ExamReadinessScore,
    UserTopicPerformance,
    WeakTopic,
)
from analytics.tests.factories import (
    AttemptSectionAnalyticsFactory,
    ExamReadinessScoreFactory,
    UserTopicPerformanceFactory,
    WeakTopicFactory,
)


@pytest.mark.django_db
class TestAttemptSectionAnalyticsModel:
    def test_create_and_string_representation(self) -> None:
        section = AttemptSectionAnalyticsFactory()
        assert isinstance(section, AttemptSectionAnalytics)
        assert section.scope_type == "topic"
        assert str(section).startswith("Section_")


@pytest.mark.django_db
class TestUserTopicPerformanceModel:
    def test_create_and_string_representation(self) -> None:
        utp = UserTopicPerformanceFactory()
        assert isinstance(utp, UserTopicPerformance)
        assert utp.success_rate == 80.0
        assert str(utp).startswith("UTP_")

    def test_unique_constraint_user_topic(self) -> None:
        utp = UserTopicPerformanceFactory()
        with pytest.raises(IntegrityError):
            UserTopicPerformanceFactory(user=utp.user, topic=utp.topic)


@pytest.mark.django_db
class TestWeakTopicModel:
    def test_create_and_string_representation(self) -> None:
        weak = WeakTopicFactory()
        assert isinstance(weak, WeakTopic)
        assert weak.status == "active"
        assert str(weak).startswith("WeakTopic_")


@pytest.mark.django_db
class TestExamReadinessScoreModel:
    def test_create_and_string_representation(self) -> None:
        readiness = ExamReadinessScoreFactory()
        assert isinstance(readiness, ExamReadinessScore)
        assert readiness.score == 75.0
        assert str(readiness).startswith("Readiness_")
