import factory
from factory.django import DjangoModelFactory

from analytics.models import (
    AttemptSectionAnalytics,
    ExamReadinessScore,
    UserTopicPerformance,
    WeakTopic,
)
from attempts.tests.factories import ExamAttemptFactory, ExamFactory, TopicFactory


class AttemptSectionAnalyticsFactory(DjangoModelFactory):
    class Meta:
        model = AttemptSectionAnalytics
        skip_postgeneration_save = True

    attempt = factory.SubFactory(ExamAttemptFactory)
    scope_type = "topic"
    scope_id = factory.LazyFunction(lambda: ExamAttemptFactory().id)
    total = 10
    correct = 7
    accuracy = 70.0
    avg_time = 45.5


class UserTopicPerformanceFactory(DjangoModelFactory):
    class Meta:
        model = UserTopicPerformance
        skip_postgeneration_save = True

    user = factory.SubFactory("accounts.tests.factories.UserFactory")
    exam = factory.SubFactory(ExamFactory)
    topic = factory.SubFactory(TopicFactory)
    attempts = 5
    correct = 4
    success_rate = 80.0
    avg_time = 32.2


class WeakTopicFactory(DjangoModelFactory):
    class Meta:
        model = WeakTopic
        skip_postgeneration_save = True

    user = factory.SubFactory("accounts.tests.factories.UserFactory")
    exam = factory.SubFactory(ExamFactory)
    topic = factory.SubFactory(TopicFactory)
    accuracy = 45.0
    severity = 2
    status = "active"


class ExamReadinessScoreFactory(DjangoModelFactory):
    class Meta:
        model = ExamReadinessScore
        skip_postgeneration_save = True

    user = factory.SubFactory("accounts.tests.factories.UserFactory")
    exam = factory.SubFactory(ExamFactory)
    score = 75.0
    components = factory.Dict(
        {
            "mock_performance": 80.0,
            "subject_accuracy": 75.0,
            "topic_accuracy": 70.0,
            "consistency": 90.0,
            "practice_completion": 60.0,
        }
    )
