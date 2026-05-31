import pytest

from questions.models import Question, QuestionOption, QuestionAppearance, QuestionStat, AiGeneratedQuestion

from .factories import (
    AiGeneratedQuestionFactory,
    DraftQuestionFactory,
    PublishedQuestionFactory,
    QuestionAppearanceFactory,
    QuestionFactory,
    QuestionOptionFactory,
    QuestionStatFactory,
)

pytestmark = pytest.mark.django_db


class TestQuestionFactory:
    def test_creates_question(self):
        question = QuestionFactory()
        assert question.id is not None
        assert question.stem is not None
        assert question.exam is not None
        assert question.subtopic is not None

    def test_defaults(self):
        question = QuestionFactory()
        assert question.difficulty == 2
        assert question.language == "as"
        assert question.origin == "manual"
        assert question.review_status == "draft"
        assert question.tags == {}

    def test_published_trait(self):
        question = QuestionFactory(published=True)
        assert question.review_status == "published"

    def test_official_trait(self):
        question = QuestionFactory(official=True)
        assert question.origin == "official"

    def test_ai_trait(self):
        question = QuestionFactory(ai=True)
        assert question.origin == "ai"


class TestPublishedQuestionFactory:
    def test_creates_published_question(self):
        question = PublishedQuestionFactory()
        assert question.review_status == "published"

    def test_stem_is_populated(self):
        question = PublishedQuestionFactory()
        assert question.stem is not None
        assert len(question.stem) > 0


class TestDraftQuestionFactory:
    def test_creates_draft_question(self):
        question = DraftQuestionFactory()
        assert question.review_status == "draft"

    def test_stem_is_populated(self):
        question = DraftQuestionFactory()
        assert question.stem is not None
        assert len(question.stem) > 0


class TestQuestionOptionFactory:
    def test_creates_option(self):
        option = QuestionOptionFactory()
        assert option.id is not None
        assert option.question is not None
        assert option.label is not None
        assert option.body is not None

    def test_defaults(self):
        option = QuestionOptionFactory()
        assert option.is_correct is False

    def test_correct_trait(self):
        option = QuestionOptionFactory(correct=True)
        assert option.is_correct is True


class TestQuestionAppearanceFactory:
    def test_creates_appearance(self):
        appearance = QuestionAppearanceFactory()
        assert appearance.id is not None
        assert appearance.question is not None
        assert appearance.paper is not None
        assert appearance.year == 2024


class TestQuestionStatFactory:
    def test_creates_stat(self):
        stat = QuestionStatFactory()
        assert stat.question is not None
        assert stat.attempts == 0
        assert stat.correct == 0
        assert stat.success_rate == 0
        assert stat.avg_time_seconds == 0

    def test_django_get_or_create(self):
        question = QuestionFactory()
        stat1 = QuestionStatFactory(question=question)
        stat2 = QuestionStatFactory(question=question)
        assert stat1.pk == stat2.pk
        assert QuestionStat.objects.count() == 1


class TestAiGeneratedQuestionFactory:
    def test_creates_ai_generated(self):
        ai_gen = AiGeneratedQuestionFactory()
        assert ai_gen.id is not None
        assert ai_gen.exam is not None
        assert ai_gen.model_used is not None
        assert ai_gen.status == "generated"

    def test_defaults(self):
        ai_gen = AiGeneratedQuestionFactory()
        assert ai_gen.credits_charged == 0
        assert ai_gen.constraints_snapshot == {}
        assert ai_gen.validation == {}
        assert ai_gen.resulting_question is None


class TestFixtureObjects:
    def test_question_fixture(self, question):
        assert question.stem == "What is Newton's First Law of Motion?"
        assert question.difficulty == 2

    def test_question_with_options_fixture(self, question_with_options):
        question, options = question_with_options
        assert len(options) == 4
        correct_options = [o for o in options if o.is_correct]
        assert len(correct_options) == 1
        assert correct_options[0].label == "A"
        assert correct_options[0].position == 1

    def test_published_question_fixture(self, published_question):
        assert published_question.review_status == "published"

    def test_draft_question_fixture(self, draft_question):
        assert draft_question.review_status == "draft"

    def test_question_appearance_fixture(self, question_appearance):
        assert question_appearance.year == 2024
        assert question_appearance.question is not None
        assert question_appearance.paper is not None

    def test_question_stat_fixture(self, question_stat):
        assert question_stat.attempts == 0
        assert question_stat.success_rate == 0

    def test_ai_generated_question_fixture(self, ai_generated_question):
        assert ai_generated_question.status == "generated"
        assert ai_generated_question.model_used == "groq/llama-3.3-70b-versatile"


class TestRelationships:
    def test_question_has_options(self):
        question = QuestionFactory()
        opt_a = QuestionOptionFactory(question=question, label="A", position=1)
        opt_b = QuestionOptionFactory(question=question, label="B", position=2)
        assert list(question.options.all()) == [opt_a, opt_b]

    def test_question_has_appearances(self):
        appearance = QuestionAppearanceFactory()
        question = appearance.question
        assert list(question.appearances.all()) == [appearance]

    def test_question_has_stat(self):
        stat = QuestionStatFactory()
        assert stat.question.stats == stat

    def test_question_has_ai_source(self):
        ai_gen = AiGeneratedQuestionFactory()
        assert ai_gen.resulting_question is None

    def test_option_belongs_to_question(self):
        option = QuestionOptionFactory()
        assert option.question is not None
        assert option in option.question.options.all()

    def test_appearance_belongs_to_question_and_paper(self):
        appearance = QuestionAppearanceFactory()
        assert appearance.question is not None
        assert appearance.paper is not None

    def test_stat_belongs_to_question(self):
        stat = QuestionStatFactory()
        assert stat.question is not None
        assert stat.question.stats == stat

    def test_ai_generated_belongs_to_exam(self):
        ai_gen = AiGeneratedQuestionFactory()
        assert ai_gen.exam is not None
        assert ai_gen in ai_gen.exam.ai_generations.all()
