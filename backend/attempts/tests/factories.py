import factory
from factory.django import DjangoModelFactory

from attempts.models import ExamAttempt, MockTest, MockTestQuestion, UserAnswer
from exams.models import Exam, PreviousYearPaper, Subject, Subtopic, Topic
from questions.models import Question, QuestionOption, QuestionStat


class ExamFactory(DjangoModelFactory):
    class Meta:
        model = Exam
        django_get_or_create = ("code",)
        skip_postgeneration_save = True

    code = factory.Sequence(lambda n: f"EXAM_{n:04d}")
    name = factory.Faker("sentence", nb_words=3)
    exam_type = "qualifying"
    is_active = True


class SubjectFactory(DjangoModelFactory):
    class Meta:
        model = Subject
        skip_postgeneration_save = True

    exam = factory.SubFactory(ExamFactory)
    name = factory.Sequence(lambda n: f"Subject {n}")
    position = factory.Sequence(lambda n: n)


class TopicFactory(DjangoModelFactory):
    class Meta:
        model = Topic
        skip_postgeneration_save = True

    subject = factory.SubFactory(SubjectFactory)
    name = factory.Sequence(lambda n: f"Topic {n}")
    position = factory.Sequence(lambda n: n)


class SubtopicFactory(DjangoModelFactory):
    class Meta:
        model = Subtopic
        skip_postgeneration_save = True

    topic = factory.SubFactory(TopicFactory)
    name = factory.Sequence(lambda n: f"Subtopic {n}")
    position = factory.Sequence(lambda n: n)


class PreviousYearPaperFactory(DjangoModelFactory):
    class Meta:
        model = PreviousYearPaper
        skip_postgeneration_save = True

    exam = factory.SubFactory(ExamFactory)
    code = factory.Sequence(lambda n: f"PYP_{n:04d}")
    year = 2024
    language = "as"
    total_questions = 150


class QuestionFactory(DjangoModelFactory):
    class Meta:
        model = Question
        skip_postgeneration_save = True

    exam = factory.SubFactory(ExamFactory)
    subtopic = factory.SubFactory(SubtopicFactory)
    stem = factory.Faker("sentence", nb_words=12)
    explanation = factory.Faker("paragraph", nb_sentences=3)
    difficulty = 2
    language = "as"
    origin = "manual"
    review_status = "published"


class PublishedQuestionFactory(QuestionFactory):
    review_status = "published"


class QuestionOptionFactory(DjangoModelFactory):
    class Meta:
        model = QuestionOption
        skip_postgeneration_save = True

    question = factory.SubFactory(QuestionFactory)
    label = factory.Sequence(lambda n: chr(65 + n % 4))
    body = factory.Faker("sentence", nb_words=8)
    is_correct = False
    position = factory.Sequence(lambda n: n)

    class Params:
        correct = factory.Trait(
            is_correct=True,
        )


class QuestionStatFactory(DjangoModelFactory):
    class Meta:
        model = QuestionStat
        skip_postgeneration_save = True
        django_get_or_create = ("question",)

    question = factory.SubFactory(QuestionFactory)
    attempts = 0
    correct = 0
    success_rate = 0
    avg_time_seconds = 0


class MockTestFactory(DjangoModelFactory):
    class Meta:
        model = MockTest
        skip_postgeneration_save = True

    exam = factory.SubFactory(ExamFactory)
    name = factory.Sequence(lambda n: f"Mock Test {n}")
    type = "system"
    duration_seconds = 7200
    total_questions = 150
    config = {}
    is_published = True


class UnpublishedMockTestFactory(MockTestFactory):
    is_published = False


class MockTestQuestionFactory(DjangoModelFactory):
    class Meta:
        model = MockTestQuestion
        skip_postgeneration_save = True

    mock_test = factory.SubFactory(MockTestFactory)
    question = factory.SubFactory(PublishedQuestionFactory)
    position = factory.Sequence(lambda n: n)
    marks = 1


class ExamAttemptFactory(DjangoModelFactory):
    class Meta:
        model = ExamAttempt
        skip_postgeneration_save = True

    user = factory.SubFactory("accounts.tests.factories.UserFactory")
    exam = factory.SubFactory(ExamFactory)
    attempt_type = "full_mock"
    status = "created"
    total_questions = 0


class InProgressAttemptFactory(ExamAttemptFactory):
    status = "in_progress"
    started_at = factory.Faker("date_time_this_month")


class UserAnswerFactory(DjangoModelFactory):
    class Meta:
        model = UserAnswer
        skip_postgeneration_save = True

    attempt = factory.SubFactory(ExamAttemptFactory)
    question = factory.SubFactory(PublishedQuestionFactory)
    state = "answered"
    is_correct = None
    time_spent_seconds = 0
