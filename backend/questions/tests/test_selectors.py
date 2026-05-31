import pytest

from questions.models import (
    AiGeneratedQuestion,
    Question,
    QuestionAppearance,
    QuestionOption,
    QuestionStat,
)

pytestmark = pytest.mark.django_db


# ═══════════════════════════════════════════════════════════════════════════════
# Content Management Selectors — question_selectors
# ═══════════════════════════════════════════════════════════════════════════════


class TestGetQuestionById:
    def test_returns_question(self, question):
        from questions.selectors.question_selectors import get_question_by_id

        result = get_question_by_id(question_id=question.id)
        assert result.id == question.id
        assert result.stem == question.stem
        assert result.exam_id == question.exam_id

    def test_raises_when_not_found(self):
        from questions.selectors.question_selectors import get_question_by_id

        with pytest.raises(Question.DoesNotExist):
            get_question_by_id(question_id="00000000-0000-0000-0000-000000000000")

    def test_uses_two_queries(self, django_assert_num_queries, question):
        from questions.selectors.question_selectors import get_question_by_id

        with django_assert_num_queries(2):
            result = get_question_by_id(question_id=question.id)
            _ = result.exam.id
            _ = result.subtopic.topic.subject.exam.id


class TestGetQuestionOptionById:
    def test_returns_option(self, question_with_options):
        from questions.selectors.question_selectors import get_question_option_by_id

        _, options = question_with_options
        result = get_question_option_by_id(option_id=options[0].id)
        assert result.id == options[0].id
        assert result.label == "A"

    def test_raises_when_not_found(self):
        from questions.selectors.question_selectors import get_question_option_by_id

        with pytest.raises(QuestionOption.DoesNotExist):
            get_question_option_by_id(
                option_id="00000000-0000-0000-0000-000000000000"
            )

    def test_uses_single_query(self, django_assert_num_queries, question_with_options):
        from questions.selectors.question_selectors import get_question_option_by_id

        _, options = question_with_options
        with django_assert_num_queries(1):
            result = get_question_option_by_id(option_id=options[0].id)
            _ = result.question.id


class TestGetQuestionAppearanceById:
    def test_returns_appearance(self, question_appearance):
        from questions.selectors.question_selectors import get_question_appearance_by_id

        result = get_question_appearance_by_id(
            appearance_id=question_appearance.id
        )
        assert result.id == question_appearance.id
        assert result.year == 2024

    def test_raises_when_not_found(self):
        from questions.selectors.question_selectors import get_question_appearance_by_id

        with pytest.raises(QuestionAppearance.DoesNotExist):
            get_question_appearance_by_id(
                appearance_id="00000000-0000-0000-0000-000000000000"
            )

    def test_uses_single_query(
        self, django_assert_num_queries, question_appearance
    ):
        from questions.selectors.question_selectors import get_question_appearance_by_id

        with django_assert_num_queries(1):
            result = get_question_appearance_by_id(
                appearance_id=question_appearance.id
            )
            _ = result.question.id
            _ = result.paper.id


class TestGetQuestionStatById:
    def test_returns_stat(self, question_stat):
        from questions.selectors.question_selectors import get_question_stat_by_id

        result = get_question_stat_by_id(question_id=question_stat.question_id)
        assert result.question_id == question_stat.question_id
        assert result.attempts == 0

    def test_raises_when_not_found(self):
        from questions.selectors.question_selectors import get_question_stat_by_id

        with pytest.raises(QuestionStat.DoesNotExist):
            get_question_stat_by_id(
                question_id="00000000-0000-0000-0000-000000000000"
            )

    def test_uses_single_query(self, django_assert_num_queries, question_stat):
        from questions.selectors.question_selectors import get_question_stat_by_id

        with django_assert_num_queries(1):
            result = get_question_stat_by_id(
                question_id=question_stat.question_id
            )
            _ = result.question.id


class TestGetAiGeneratedQuestionById:
    def test_returns_ai_gen(self, ai_generated_question):
        from questions.selectors.question_selectors import (
            get_ai_generated_question_by_id,
        )

        result = get_ai_generated_question_by_id(
            ai_gen_id=ai_generated_question.id
        )
        assert result.id == ai_generated_question.id
        assert result.status == "generated"

    def test_raises_when_not_found(self):
        from questions.selectors.question_selectors import (
            get_ai_generated_question_by_id,
        )

        with pytest.raises(AiGeneratedQuestion.DoesNotExist):
            get_ai_generated_question_by_id(
                ai_gen_id="00000000-0000-0000-0000-000000000000"
            )

    def test_uses_single_query(
        self, django_assert_num_queries, ai_generated_question
    ):
        from questions.selectors.question_selectors import (
            get_ai_generated_question_by_id,
        )

        with django_assert_num_queries(1):
            result = get_ai_generated_question_by_id(
                ai_gen_id=ai_generated_question.id
            )
            _ = result.exam.id
            _ = result.subtopic.id


class TestListQuestions:
    def test_returns_all(self):
        from questions.selectors.question_selectors import list_questions

        q1 = QuestionFactory()
        q2 = QuestionFactory()
        results = list(list_questions())
        assert len(results) >= 2
        assert q1 in results
        assert q2 in results

    def test_filters_by_exam(self, exam_hierarchy):
        from questions.selectors.question_selectors import list_questions

        q1 = QuestionFactory(exam=exam_hierarchy["exam"])
        other_exam = ExamFactory()
        QuestionFactory(exam=other_exam)

        results = list(list_questions(exam_id=exam_hierarchy["exam"].id))
        assert len(results) == 1
        assert results[0].id == q1.id

    def test_filters_by_review_status(self):
        from questions.selectors.question_selectors import list_questions

        published = QuestionFactory(published=True)
        QuestionFactory()  # draft
        results = list(list_questions(review_status="published"))
        assert len(results) == 1
        assert results[0].id == published.id

    def test_returns_empty(self):
        from questions.selectors.question_selectors import list_questions

        assert list(list_questions(exam_id="00000000-0000-0000-0000-000000000000")) == []

    def test_uses_two_queries(self, django_assert_num_queries):
        from questions.selectors.question_selectors import list_questions

        QuestionFactory()
        QuestionFactory()
        with django_assert_num_queries(2):
            list(list_questions())


class TestListQuestionsForExam:
    def test_returns_questions_for_exam(self, exam):
        from questions.selectors.question_selectors import list_questions_for_exam

        q1 = QuestionFactory(exam=exam)
        q2 = QuestionFactory(exam=exam)
        other = QuestionFactory()

        results = list(list_questions_for_exam(exam_id=exam.id))
        assert len(results) == 2
        assert q1 in results
        assert q2 in results
        assert other not in results

    def test_filters_by_review_status(self, exam):
        from questions.selectors.question_selectors import list_questions_for_exam

        published = QuestionFactory(exam=exam, published=True)
        QuestionFactory(exam=exam)

        results = list(
            list_questions_for_exam(exam_id=exam.id, review_status="published")
        )
        assert len(results) == 1
        assert results[0].id == published.id

    def test_empty(self, exam):
        from questions.selectors.question_selectors import list_questions_for_exam

        assert list(list_questions_for_exam(exam_id=exam.id)) == []

    def test_uses_single_query(self, django_assert_num_queries, exam):
        from questions.selectors.question_selectors import list_questions_for_exam

        QuestionFactory(exam=exam)
        with django_assert_num_queries(1):
            list(list_questions_for_exam(exam_id=exam.id))


class TestListQuestionsForSubtopic:
    def test_returns_questions_for_subtopic(self, subtopic):
        from questions.selectors.question_selectors import list_questions_for_subtopic

        q1 = QuestionFactory(subtopic=subtopic)
        q2 = QuestionFactory(subtopic=subtopic)
        other_subtopic = SubtopicFactory()
        QuestionFactory(subtopic=other_subtopic)

        results = list(list_questions_for_subtopic(subtopic_id=subtopic.id))
        assert len(results) == 2
        assert q1 in results
        assert q2 in results

    def test_empty(self, subtopic):
        from questions.selectors.question_selectors import list_questions_for_subtopic

        assert list(list_questions_for_subtopic(subtopic_id=subtopic.id)) == []

    def test_uses_single_query(self, django_assert_num_queries, subtopic):
        from questions.selectors.question_selectors import list_questions_for_subtopic

        QuestionFactory(subtopic=subtopic)
        with django_assert_num_queries(1):
            list(list_questions_for_subtopic(subtopic_id=subtopic.id))


class TestListQuestionsByDifficulty:
    def test_filters_by_difficulty(self):
        from questions.selectors.question_selectors import list_questions_by_difficulty

        easy = QuestionFactory(difficulty=1)
        QuestionFactory(difficulty=3)

        results = list(list_questions_by_difficulty(difficulty=1))
        assert len(results) >= 1
        assert easy in results

    def test_filters_by_exam_and_difficulty(self, exam):
        from questions.selectors.question_selectors import list_questions_by_difficulty

        q = QuestionFactory(exam=exam, difficulty=1)
        other_exam = ExamFactory()
        QuestionFactory(exam=other_exam, difficulty=1)

        results = list(
            list_questions_by_difficulty(difficulty=1, exam_id=exam.id)
        )
        assert len(results) == 1
        assert results[0].id == q.id

    def test_returns_empty_when_no_match(self):
        from questions.selectors.question_selectors import list_questions_by_difficulty

        QuestionFactory(difficulty=1)
        results = list(list_questions_by_difficulty(difficulty=5))
        assert results == []

    def test_uses_single_query(self, django_assert_num_queries):
        from questions.selectors.question_selectors import list_questions_by_difficulty

        QuestionFactory(difficulty=1)
        with django_assert_num_queries(1):
            list(list_questions_by_difficulty(difficulty=1))


class TestListQuestionOptionsForQuestion:
    def test_returns_options_in_order(self, question_with_options):
        from questions.selectors.question_selectors import (
            list_question_options_for_question,
        )

        question, options = question_with_options
        results = list(
            list_question_options_for_question(question_id=question.id)
        )
        assert len(results) == 4
        assert results[0].position == 1
        assert results[1].position == 2

    def test_empty(self, question):
        from questions.selectors.question_selectors import (
            list_question_options_for_question,
        )

        results = list(
            list_question_options_for_question(question_id=question.id)
        )
        assert results == []

    def test_uses_single_query(self, django_assert_num_queries, question_with_options):
        from questions.selectors.question_selectors import (
            list_question_options_for_question,
        )

        question, _ = question_with_options
        with django_assert_num_queries(1):
            list(list_question_options_for_question(question_id=question.id))


class TestListQuestionAppearancesForQuestion:
    def test_returns_appearances_in_order(self, question_appearance):
        from questions.selectors.question_selectors import (
            list_question_appearances_for_question,
        )

        results = list(
            list_question_appearances_for_question(
                question_id=question_appearance.question_id
            )
        )
        assert len(results) == 1
        assert results[0].year == 2024

    def test_empty(self, question):
        from questions.selectors.question_selectors import (
            list_question_appearances_for_question,
        )

        results = list(
            list_question_appearances_for_question(question_id=question.id)
        )
        assert results == []

    def test_uses_single_query(
        self, django_assert_num_queries, question_appearance
    ):
        from questions.selectors.question_selectors import (
            list_question_appearances_for_question,
        )

        with django_assert_num_queries(1):
            results = list(
                list_question_appearances_for_question(
                    question_id=question_appearance.question_id
                )
            )
            _ = results[0].paper.id


class TestGetQuestionStats:
    def test_returns_all_stats(self):
        from questions.selectors.question_selectors import get_question_stats

        QuestionStatFactory()
        QuestionStatFactory()
        results = list(get_question_stats())
        assert len(results) >= 2

    def test_filters_by_question_ids(self):
        from questions.selectors.question_selectors import get_question_stats

        stat1 = QuestionStatFactory()
        stat2 = QuestionStatFactory()
        QuestionStatFactory()

        results = list(
            get_question_stats(
                question_ids=[stat1.question_id, stat2.question_id]
            )
        )
        assert len(results) == 2

    def test_returns_empty_for_unknown_ids(self):
        from questions.selectors.question_selectors import get_question_stats

        results = list(
            get_question_stats(
                question_ids=["00000000-0000-0000-0000-000000000000"]
            )
        )
        assert results == []

    def test_uses_single_query(self, django_assert_num_queries):
        from questions.selectors.question_selectors import get_question_stats

        QuestionStatFactory()
        QuestionStatFactory()
        with django_assert_num_queries(1):
            list(get_question_stats())


class TestListAiGenerationsForExam:
    def test_returns_generations_for_exam(self, exam):
        from questions.selectors.question_selectors import (
            list_ai_generations_for_exam,
        )

        gen1 = AiGeneratedQuestionFactory(exam=exam)
        gen2 = AiGeneratedQuestionFactory(exam=exam)
        other = AiGeneratedQuestionFactory()

        results = list(list_ai_generations_for_exam(exam_id=exam.id))
        assert len(results) == 2
        assert gen1 in results
        assert gen2 in results
        assert other not in results

    def test_filters_by_status(self, exam):
        from questions.selectors.question_selectors import (
            list_ai_generations_for_exam,
        )

        validated = AiGeneratedQuestionFactory(exam=exam, status="validated")
        AiGeneratedQuestionFactory(exam=exam, status="discarded")

        results = list(
            list_ai_generations_for_exam(exam_id=exam.id, status="validated")
        )
        assert len(results) == 1
        assert results[0].id == validated.id

    def test_empty(self, exam):
        from questions.selectors.question_selectors import (
            list_ai_generations_for_exam,
        )

        results = list(list_ai_generations_for_exam(exam_id=exam.id))
        assert results == []

    def test_uses_single_query(self, django_assert_num_queries, exam):
        from questions.selectors.question_selectors import (
            list_ai_generations_for_exam,
        )

        AiGeneratedQuestionFactory(exam=exam)
        with django_assert_num_queries(1):
            list(list_ai_generations_for_exam(exam_id=exam.id))


# ═══════════════════════════════════════════════════════════════════════════════
# Learner Selectors — learner_selectors
# ═══════════════════════════════════════════════════════════════════════════════


class TestGetPublishedQuestionById:
    def test_returns_published_question(self, published_question):
        from questions.selectors.learner_selectors import (
            get_published_question_by_id,
        )

        result = get_published_question_by_id(
            question_id=published_question.id
        )
        assert result.id == published_question.id
        assert result.review_status == "published"

    def test_raises_when_draft(self, draft_question):
        from questions.selectors.learner_selectors import (
            get_published_question_by_id,
        )

        with pytest.raises(Question.DoesNotExist):
            get_published_question_by_id(question_id=draft_question.id)

    def test_raises_when_not_found(self):
        from questions.selectors.learner_selectors import (
            get_published_question_by_id,
        )

        with pytest.raises(Question.DoesNotExist):
            get_published_question_by_id(
                question_id="00000000-0000-0000-0000-000000000000"
            )

    def test_prefetches_options(
        self, django_assert_num_queries, published_question
    ):
        from questions.selectors.learner_selectors import (
            get_published_question_by_id,
        )

        from .factories import QuestionOptionFactory

        QuestionOptionFactory(
            question=published_question, label="A", position=1
        )
        QuestionOptionFactory(
            question=published_question, label="B", position=2
        )

        # 1 query for main question + 1 for prefetched options = 2 total
        with django_assert_num_queries(2):
            result = get_published_question_by_id(
                question_id=published_question.id
            )
            assert len(list(result.options.all())) == 2

    def test_uses_optimized_query(
        self, django_assert_num_queries, published_question
    ):
        from questions.selectors.learner_selectors import (
            get_published_question_by_id,
        )

        # 1 query for main question + 1 for prefetched options = 2 total
        with django_assert_num_queries(2):
            result = get_published_question_by_id(
                question_id=published_question.id
            )
            _ = result.exam.id
            _ = result.subtopic.topic.subject.exam.id


class TestListPublishedQuestions:
    def test_returns_only_published(self):
        from questions.selectors.learner_selectors import list_published_questions

        published = QuestionFactory(published=True)
        QuestionFactory()  # draft
        QuestionFactory(published=False)  # draft (same thing)

        results = list(list_published_questions())
        assert len(results) >= 1
        assert published in results
        for q in results:
            assert q.review_status == "published"

    def test_filters_by_exam(self, exam):
        from questions.selectors.learner_selectors import list_published_questions

        q = QuestionFactory(exam=exam, published=True)
        other_exam = ExamFactory()
        QuestionFactory(exam=other_exam, published=True)

        results = list(list_published_questions(exam_id=exam.id))
        assert len(results) == 1
        assert results[0].id == q.id

    def test_returns_empty_when_none_published(self, exam):
        from questions.selectors.learner_selectors import list_published_questions

        QuestionFactory(exam=exam)  # draft, not published

        results = list(list_published_questions(exam_id=exam.id))
        assert results == []

    def test_prefetches_options(self, django_assert_num_queries):
        from questions.selectors.learner_selectors import list_published_questions

        from .factories import QuestionOptionFactory

        q = QuestionFactory(published=True)
        QuestionOptionFactory(question=q, label="A", position=1)
        QuestionOptionFactory(question=q, label="B", position=2)

        # 1 query for main question list + 1 for prefetched options = 2 total
        with django_assert_num_queries(2):
            results = list(list_published_questions())
            for r in results:
                assert len(list(r.options.all())) == 2


class TestListPublishedQuestionsForSubtopic:
    def test_returns_only_published_for_subtopic(self, subtopic):
        from questions.selectors.learner_selectors import (
            list_published_questions_for_subtopic,
        )

        published = QuestionFactory(subtopic=subtopic, published=True)
        QuestionFactory(subtopic=subtopic)  # draft
        other_subtopic = SubtopicFactory()
        QuestionFactory(subtopic=other_subtopic, published=True)

        results = list(
            list_published_questions_for_subtopic(subtopic_id=subtopic.id)
        )
        assert len(results) == 1
        assert results[0].id == published.id
        assert results[0].review_status == "published"

    def test_returns_empty_when_none_published(self, subtopic):
        from questions.selectors.learner_selectors import (
            list_published_questions_for_subtopic,
        )

        QuestionFactory(subtopic=subtopic)

        results = list(
            list_published_questions_for_subtopic(subtopic_id=subtopic.id)
        )
        assert results == []

    def test_prefetches_options(self, django_assert_num_queries, subtopic):
        from questions.selectors.learner_selectors import (
            list_published_questions_for_subtopic,
        )

        from .factories import QuestionOptionFactory

        q = QuestionFactory(subtopic=subtopic, published=True)
        QuestionOptionFactory(question=q, label="A", position=1)

        # 1 query for main question list + 1 for prefetched options = 2 total
        with django_assert_num_queries(2):
            results = list(
                list_published_questions_for_subtopic(subtopic_id=subtopic.id)
            )
            for r in results:
                assert len(list(r.options.all())) == 1


# ═══════════════════════════════════════════════════════════════════════════════
# Published-Only Enforcement — platform invariant
# ═══════════════════════════════════════════════════════════════════════════════


class TestPublishedOnlyEnforcement:
    def test_content_manager_can_see_all_statuses(self):
        from questions.selectors.question_selectors import list_questions

        QuestionFactory(review_status="draft")
        QuestionFactory(review_status="in_review")
        QuestionFactory(review_status="sme_review")
        QuestionFactory(review_status="approved")
        QuestionFactory(published=True)
        QuestionFactory(review_status="rejected")

        results = list(list_questions())
        statuses = {q.review_status for q in results}
        assert statuses == {
            "draft",
            "in_review",
            "sme_review",
            "approved",
            "published",
            "rejected",
        }

    def test_learner_cannot_see_draft(self):
        from questions.selectors.learner_selectors import list_published_questions

        QuestionFactory(review_status="draft")
        QuestionFactory(review_status="in_review")
        QuestionFactory(review_status="sme_review")
        QuestionFactory(review_status="approved")
        QuestionFactory(review_status="rejected")
        published = QuestionFactory(published=True)

        results = list(list_published_questions())
        assert len(results) == 1
        assert results[0].id == published.id

    def test_learner_cannot_access_non_published_by_id(self):
        from questions.selectors.learner_selectors import (
            get_published_question_by_id,
        )

        for status in ["draft", "in_review", "sme_review", "approved", "rejected"]:
            q = QuestionFactory(review_status=status)
            with pytest.raises(Question.DoesNotExist):
                get_published_question_by_id(question_id=q.id)


# Local imports for factory classes used directly in tests
from .factories import (
    AiGeneratedQuestionFactory,
    ExamFactory,
    QuestionFactory,
    QuestionOptionFactory,
    QuestionStatFactory,
    SubtopicFactory,
)
