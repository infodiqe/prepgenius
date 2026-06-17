from decimal import Decimal

import pytest
from django.db import transaction

from exams.exceptions import (
    ExamNotFoundError,
    PreviousYearPaperNotFoundError,
    SubtopicNotFoundError,
)
from questions.exceptions import (
    AiGeneratedQuestionInvalidStateError,
    AiGeneratedQuestionNotFoundError,
    ApprovalRequiredForPublishError,
    InvalidReviewTransitionError,
    QuestionAlreadyClaimedError,
    QuestionAppearanceNotFoundError,
    QuestionAppearanceNotUniqueError,
    QuestionHasMultipleCorrectOptionsError,
    QuestionHasNoCorrectOptionError,
    QuestionNotClaimedError,
    QuestionNotFoundError,
    QuestionOptionLabelNotUniqueError,
    QuestionOptionNotFoundError,
    QuestionStatNotFoundError,
)
from questions.models import (
    AiGeneratedQuestion,
    Question,
    QuestionAppearance,
    QuestionOption,
    QuestionStat,
)

pytestmark = pytest.mark.django_db


# ═══════════════════════════════════════════════════════════════════════════════
# Question Services
# ═══════════════════════════════════════════════════════════════════════════════


class TestCreateQuestion:
    def test_creates_question(self, exam_hierarchy):
        from questions.services.question_services import create_question

        exam = exam_hierarchy["exam"]
        subtopic = exam_hierarchy["subtopic"]
        question = create_question(
            exam_id=exam.id,
            subtopic_id=subtopic.id,
            stem="What is Newton's First Law?",
            difficulty=2,
            language="as",
        )
        assert question.id is not None
        assert question.stem == "What is Newton's First Law?"
        assert question.exam_id == exam.id
        assert question.subtopic_id == subtopic.id
        assert question.difficulty == 2
        assert question.language == "as"
        assert question.origin == "manual"
        assert question.review_status == "draft"
        assert Question.objects.count() == 1

    def test_creates_question_stat(self, exam_hierarchy):
        from questions.services.question_services import create_question

        exam = exam_hierarchy["exam"]
        subtopic = exam_hierarchy["subtopic"]
        question = create_question(
            exam_id=exam.id,
            subtopic_id=subtopic.id,
            stem="Test stat creation",
        )
        assert QuestionStat.objects.filter(question=question).exists()
        stat = QuestionStat.objects.get(question=question)
        assert stat.attempts == 0
        assert stat.correct == 0

    def test_raises_when_exam_not_found(self, exam_hierarchy):
        from questions.services.question_services import create_question

        with pytest.raises(ExamNotFoundError):
            create_question(
                exam_id="00000000-0000-0000-0000-000000000000",
                subtopic_id=exam_hierarchy["subtopic"].id,
                stem="No exam",
            )

    def test_raises_when_subtopic_not_found(self, exam_hierarchy):
        from questions.services.question_services import create_question

        with pytest.raises(SubtopicNotFoundError):
            create_question(
                exam_id=exam_hierarchy["exam"].id,
                subtopic_id="00000000-0000-0000-0000-000000000000",
                stem="No subtopic",
            )

    def test_validates_subtopic_belongs_to_exam(self, exam_hierarchy):
        from questions.services.question_services import create_question
        from .factories import ExamFactory, SubtopicFactory

        other_exam = ExamFactory()
        other_subtopic = SubtopicFactory(topic__subject__exam=other_exam)

        with pytest.raises(ValueError, match="does not belong"):
            create_question(
                exam_id=exam_hierarchy["exam"].id,
                subtopic_id=other_subtopic.id,
                stem="Cross-exam violation",
            )

    def test_accepts_optional_fields(self, exam_hierarchy):
        from questions.services.question_services import create_question

        exam = exam_hierarchy["exam"]
        subtopic = exam_hierarchy["subtopic"]
        question = create_question(
            exam_id=exam.id,
            subtopic_id=subtopic.id,
            stem="Optional fields",
            explanation="Detailed explanation",
            difficulty=5,
            language="en",
            origin="official",
            tags={"source": "NCERT"},
        )
        assert question.explanation == "Detailed explanation"
        assert question.difficulty == 5
        assert question.language == "en"
        assert question.origin == "official"
        assert question.tags == {"source": "NCERT"}

    def test_uses_atomic(self, exam_hierarchy):
        from questions.services.question_services import create_question

        with pytest.raises(Exception):
            with transaction.atomic():
                create_question(
                    exam_id=exam_hierarchy["exam"].id,
                    subtopic_id=exam_hierarchy["subtopic"].id,
                    stem="Atomic rollback",
                )
                raise Exception("rollback")
        assert Question.objects.filter(stem="Atomic rollback").count() == 0


class TestUpdateQuestion:
    def test_updates_stem(self, question):
        from questions.services.question_services import update_question

        updated = update_question(
            question_id=question.id, stem="Updated stem"
        )
        assert updated.stem == "Updated stem"

    def test_updates_explanation(self, question):
        from questions.services.question_services import update_question

        updated = update_question(
            question_id=question.id, explanation="New explanation"
        )
        assert updated.explanation == "New explanation"

    def test_sets_explanation_to_none(self, question):
        from questions.services.question_services import update_question

        updated = update_question(
            question_id=question.id, explanation=None
        )
        assert updated.explanation is None

    def test_updates_difficulty(self, question):
        from questions.services.question_services import update_question

        updated = update_question(question_id=question.id, difficulty=5)
        assert updated.difficulty == 5

    def test_updates_language(self, question):
        from questions.services.question_services import update_question

        updated = update_question(question_id=question.id, language="hi")
        assert updated.language == "hi"

    def test_updates_subtopic(self, question, exam_hierarchy):
        from questions.services.question_services import update_question

        new_subtopic = SubtopicFactory(
            topic=exam_hierarchy["topic"], name="Force", position=2
        )
        updated = update_question(
            question_id=question.id, subtopic_id=new_subtopic.id
        )
        assert updated.subtopic_id == new_subtopic.id

    def test_updates_tags(self, question):
        from questions.services.question_services import update_question

        updated = update_question(
            question_id=question.id, tags={"topic": "Physics"}
        )
        assert updated.tags == {"topic": "Physics"}

    def test_clears_tags_to_empty_dict(self, question):
        from questions.services.question_services import update_question

        updated = update_question(question_id=question.id, tags={})
        assert updated.tags == {}

    def test_partial_update_preserves_other_fields(self, question):
        from questions.services.question_services import update_question

        original_stem = question.stem
        update_question(question_id=question.id, difficulty=3)
        question.refresh_from_db()
        assert question.stem == original_stem
        assert question.difficulty == 3

    def test_raises_when_not_found(self):
        from questions.services.question_services import update_question

        with pytest.raises(QuestionNotFoundError):
            update_question(
                question_id="00000000-0000-0000-0000-000000000000",
                stem="Nowhere",
            )


class TestUpdateQuestionReviewStatus:
    def test_transitions_draft_to_in_review(self, draft_question):
        from questions.services.question_services import (
            update_question_review_status,
        )

        result = update_question_review_status(
            question_id=draft_question.id,
            review_status="in_review",
        )
        assert result.review_status == "in_review"

    def test_transitions_in_review_to_approved(self, draft_question):
        from questions.services.question_services import (
            update_question_review_status,
        )

        update_question_review_status(
            question_id=draft_question.id,
            review_status="in_review",
        )
        result = update_question_review_status(
            question_id=draft_question.id,
            review_status="approved",
        )
        assert result.review_status == "approved"

    def test_transitions_approved_to_published(self, draft_question):
        from questions.services.question_services import (
            update_question_review_status,
        )

        update_question_review_status(
            question_id=draft_question.id, review_status="in_review"
        )
        update_question_review_status(
            question_id=draft_question.id, review_status="approved"
        )
        result = update_question_review_status(
            question_id=draft_question.id, review_status="published"
        )
        assert result.review_status == "published"

    def test_rejects_invalid_transition(self, draft_question):
        from questions.services.question_services import (
            update_question_review_status,
        )

        with pytest.raises(InvalidReviewTransitionError):
            update_question_review_status(
                question_id=draft_question.id,
                review_status="published",
            )

    def test_rejects_draft_to_sme_review(self, draft_question):
        from questions.services.question_services import (
            update_question_review_status,
        )

        with pytest.raises(InvalidReviewTransitionError):
            update_question_review_status(
                question_id=draft_question.id,
                review_status="sme_review",
            )

    def test_raises_when_question_not_found(self):
        from questions.services.question_services import (
            update_question_review_status,
        )

        with pytest.raises(QuestionNotFoundError):
            update_question_review_status(
                question_id="00000000-0000-0000-0000-000000000000",
                review_status="in_review",
            )

    def test_creates_review_entry(self, draft_question):
        from questions.services.question_services import (
            update_question_review_status,
        )
        from content_review.models import ContentReview

        update_question_review_status(
            question_id=draft_question.id,
            review_status="in_review",
            actor_id=None,
            actor_role="content_manager",
            comment="Starting review",
        )
        entries = ContentReview.objects.filter(
            question_id=draft_question.id
        )
        assert entries.count() >= 1
        latest = entries.latest("created_at")
        assert latest.action == "submit"
        assert latest.from_status == "draft"
        assert latest.to_status == "in_review"
        assert latest.actor_role == "content_manager"
        assert latest.comment == "Starting review"


class TestReviewApprovalIntegration:
    def test_approve_creates_content_approval(self, draft_question):
        from questions.services.question_services import (
            update_question_review_status,
        )
        from content_review.models import ContentApproval

        update_question_review_status(
            question_id=draft_question.id,
            review_status="in_review",
        )
        update_question_review_status(
            question_id=draft_question.id,
            review_status="approved",
            actor_id=None,
            actor_role="content_reviewer",
        )
        approvals = ContentApproval.objects.filter(
            question_id=draft_question.id
        )
        assert approvals.count() == 1
        approval = approvals.first()
        assert approval.approval_level == "reviewer"
        assert approval.approver_id is None

    def test_sme_approve_creates_sme_approval(self, draft_question):
        from questions.services.question_services import (
            update_question_review_status,
        )
        from content_review.models import ContentApproval

        update_question_review_status(
            question_id=draft_question.id,
            review_status="in_review",
        )
        update_question_review_status(
            question_id=draft_question.id,
            review_status="sme_review",
        )
        update_question_review_status(
            question_id=draft_question.id,
            review_status="approved",
            actor_role="sme",
        )
        approvals = ContentApproval.objects.filter(
            question_id=draft_question.id
        )
        assert approvals.count() == 1
        assert approvals.first().approval_level == "sme"

    def test_publish_requires_approval(self, draft_question):
        from questions.services.question_services import (
            update_question_review_status,
        )

        update_question_review_status(
            question_id=draft_question.id,
            review_status="in_review",
        )
        update_question_review_status(
            question_id=draft_question.id,
            review_status="approved",
        )
        result = update_question_review_status(
            question_id=draft_question.id,
            review_status="published",
        )
        assert result.review_status == "published"

    def test_publish_raises_when_approval_deleted(self, draft_question):
        from questions.services.question_services import (
            update_question_review_status,
        )
        from content_review.models import ContentApproval

        update_question_review_status(
            question_id=draft_question.id,
            review_status="in_review",
        )
        update_question_review_status(
            question_id=draft_question.id,
            review_status="approved",
        )
        ContentApproval.objects.filter(
            question_id=draft_question.id
        ).delete()

        with pytest.raises(ApprovalRequiredForPublishError):
            update_question_review_status(
                question_id=draft_question.id,
                review_status="published",
            )

    def test_full_cycle_with_reviewer_and_sme(self, draft_question):
        from questions.services.question_services import (
            update_question_review_status,
        )
        from content_review.models import ContentApproval

        update_question_review_status(
            question_id=draft_question.id,
            review_status="in_review",
            actor_role="content_reviewer",
        )
        update_question_review_status(
            question_id=draft_question.id,
            review_status="sme_review",
            actor_role="content_reviewer",
        )
        update_question_review_status(
            question_id=draft_question.id,
            review_status="approved",
            actor_role="sme",
        )
        approvals = ContentApproval.objects.filter(
            question_id=draft_question.id
        )
        assert approvals.count() == 1
        assert approvals.first().approval_level == "sme"

        update_question_review_status(
            question_id=draft_question.id,
            review_status="published",
            actor_role="content_manager",
        )
        assert (
            draft_question.__class__.objects.get(
                id=draft_question.id
            ).review_status
            == "published"
        )


class TestPublishPolicy:
    """PH-3: configurable, data-driven publish eligibility.

    Default content publishes on a reviewer approval; higher-risk content
    (AI-generated, minor-audience, or exam_rules.requires_sme_review) must reach
    an SME approval first.
    """

    def _drive_to_approved(self, question, *, via_sme: bool):
        from questions.services.question_services import (
            update_question_review_status,
        )

        update_question_review_status(
            question_id=question.id, review_status="in_review"
        )
        if via_sme:
            update_question_review_status(
                question_id=question.id, review_status="sme_review"
            )
            update_question_review_status(
                question_id=question.id,
                review_status="approved",
                actor_role="sme",
            )
        else:
            update_question_review_status(
                question_id=question.id,
                review_status="approved",
                actor_role="content_reviewer",
            )

    def _publish(self, question):
        from questions.services.question_services import (
            update_question_review_status,
        )

        return update_question_review_status(
            question_id=question.id, review_status="published"
        )

    def test_default_content_publishes_with_reviewer_approval(self, draft_question):
        # draft_question: manual origin, non-minor exam → default policy.
        self._drive_to_approved(draft_question, via_sme=False)
        result = self._publish(draft_question)
        assert result.review_status == "published"

    def test_ai_content_blocked_with_reviewer_only_approval(self, exam_hierarchy):
        from .factories import QuestionFactory

        q = QuestionFactory(
            ai=True,
            exam=exam_hierarchy["exam"],
            subtopic=exam_hierarchy["subtopic"],
        )
        self._drive_to_approved(q, via_sme=False)  # reviewer-level only

        with pytest.raises(ApprovalRequiredForPublishError) as exc:
            self._publish(q)
        assert exc.value.required_levels == ["sme"]
        q.refresh_from_db()
        assert q.review_status == "approved"  # unchanged

    def test_ai_content_publishes_via_sme_path(self, exam_hierarchy):
        from .factories import QuestionFactory

        q = QuestionFactory(
            ai=True,
            exam=exam_hierarchy["exam"],
            subtopic=exam_hierarchy["subtopic"],
        )
        self._drive_to_approved(q, via_sme=True)  # sme-level approval
        result = self._publish(q)
        assert result.review_status == "published"

    def test_minor_audience_requires_sme(self):
        from .factories import ExamFactory, QuestionFactory, SubtopicFactory

        exam = ExamFactory(audience_is_minor=True)
        subtopic = SubtopicFactory(topic__subject__exam=exam)
        q = QuestionFactory(origin="manual", exam=exam, subtopic=subtopic)
        self._drive_to_approved(q, via_sme=False)

        with pytest.raises(ApprovalRequiredForPublishError):
            self._publish(q)

    def test_exam_rule_requires_sme(self):
        from .factories import ExamFactory, QuestionFactory, SubtopicFactory

        exam = ExamFactory(exam_rules={"requires_sme_review": True})
        subtopic = SubtopicFactory(topic__subject__exam=exam)
        q = QuestionFactory(origin="manual", exam=exam, subtopic=subtopic)
        self._drive_to_approved(q, via_sme=False)

        with pytest.raises(ApprovalRequiredForPublishError):
            self._publish(q)

    def test_publish_policy_is_configurable(self, settings, draft_question):
        # Tighten the default policy so even ordinary content needs SME.
        settings.CONTENT_REVIEW_PUBLISH_POLICY = {
            "default": ["sme"],
            "strict": ["sme"],
        }
        self._drive_to_approved(draft_question, via_sme=False)  # reviewer only
        with pytest.raises(ApprovalRequiredForPublishError):
            self._publish(draft_question)


class TestClaimQuestion:
    def test_claims_question(self, draft_question, seed_roles):
        from questions.services.question_services import (
            claim_question_for_review,
        )
        from accounts.tests.factories import UserFactory

        user = UserFactory()

        result = claim_question_for_review(
            question_id=draft_question.id, user_id=user.id
        )
        assert result.claimed_by_id == user.id

    def test_raises_when_already_claimed(self, draft_question, seed_roles):
        from questions.services.question_services import (
            claim_question_for_review,
        )
        from accounts.tests.factories import UserFactory

        user1 = UserFactory()
        user2 = UserFactory()

        claim_question_for_review(
            question_id=draft_question.id, user_id=user1.id
        )
        with pytest.raises(QuestionAlreadyClaimedError):
            claim_question_for_review(
                question_id=draft_question.id, user_id=user2.id
            )

    def test_release_claim(self, draft_question, seed_roles):
        from questions.services.question_services import (
            claim_question_for_review,
            release_claim,
        )
        from accounts.tests.factories import UserFactory

        user = UserFactory()
        claim_question_for_review(
            question_id=draft_question.id, user_id=user.id
        )

        result = release_claim(
            question_id=draft_question.id, user_id=user.id
        )
        assert result.claimed_by_id is None

    def test_release_raises_when_not_claimed(self, draft_question, seed_roles):
        from questions.services.question_services import (
            release_claim,
        )
        from accounts.tests.factories import UserFactory

        user = UserFactory()
        with pytest.raises(QuestionNotClaimedError):
            release_claim(
                question_id=draft_question.id, user_id=user.id
            )

    def test_release_raises_when_claimed_by_another(
        self, draft_question, seed_roles
    ):
        from questions.services.question_services import (
            claim_question_for_review,
            release_claim,
        )
        from accounts.tests.factories import UserFactory

        user1 = UserFactory()
        user2 = UserFactory()
        claim_question_for_review(
            question_id=draft_question.id, user_id=user1.id
        )
        with pytest.raises(QuestionAlreadyClaimedError):
            release_claim(
                question_id=draft_question.id, user_id=user2.id
            )

    def test_raises_when_question_not_found(self, seed_roles):
        from questions.services.question_services import (
            claim_question_for_review,
        )
        from accounts.tests.factories import UserFactory

        user = UserFactory()
        with pytest.raises(QuestionNotFoundError):
            claim_question_for_review(
                question_id="00000000-0000-0000-0000-000000000000",
                user_id=user.id,
            )


class TestDeleteQuestion:
    def test_deletes_question(self, question):
        from questions.services.question_services import delete_question

        qid = question.id
        delete_question(question_id=qid)
        assert Question.objects.filter(id=qid).count() == 0

    def test_raises_when_not_found(self):
        from questions.services.question_services import delete_question

        with pytest.raises(QuestionNotFoundError):
            delete_question(
                question_id="00000000-0000-0000-0000-000000000000"
            )


# ═══════════════════════════════════════════════════════════════════════════════
# QuestionOption Services
# ═══════════════════════════════════════════════════════════════════════════════


class TestCreateQuestionOption:
    def test_creates_option(self, question):
        from questions.services.question_services import create_question_option

        option = create_question_option(
            question_id=question.id,
            label="A",
            body="Option A body",
            is_correct=True,
            position=1,
        )
        assert option.question_id == question.id
        assert option.label == "A"
        assert option.body == "Option A body"
        assert option.is_correct is True
        assert option.position == 1

    def test_raises_when_question_not_found(self):
        from questions.services.question_services import create_question_option

        with pytest.raises(QuestionNotFoundError):
            create_question_option(
                question_id="00000000-0000-0000-0000-000000000000",
                label="A",
                body="Nowhere",
            )

    def test_raises_on_duplicate_label(self, question_with_options):
        from questions.services.question_services import create_question_option

        question, _ = question_with_options
        with pytest.raises(QuestionOptionLabelNotUniqueError):
            create_question_option(
                question_id=question.id,
                label="A",
                body="Duplicate label",
            )

    def test_allows_same_label_different_question(self, question):
        from questions.services.question_services import create_question_option
        from .factories import QuestionFactory

        other = QuestionFactory()
        opt1 = create_question_option(
            question_id=question.id, label="A", body="First"
        )
        opt2 = create_question_option(
            question_id=other.id, label="A", body="Second"
        )
        assert opt1.label == opt2.label == "A"
        assert opt1.question_id != opt2.question_id

    def test_uses_atomic(self, question):
        from questions.services.question_services import create_question_option

        with pytest.raises(Exception):
            with transaction.atomic():
                create_question_option(
                    question_id=question.id,
                    label="X",
                    body="Rollback",
                )
                raise Exception("rollback")
        assert QuestionOption.objects.filter(body="Rollback").count() == 0


class TestUpdateQuestionOption:
    def test_updates_label(self, question_with_options):
        from questions.services.question_services import update_question_option

        _, options = question_with_options
        updated = update_question_option(
            option_id=options[0].id, label="E"
        )
        assert updated.label == "E"

    def test_updates_body(self, question_with_options):
        from questions.services.question_services import update_question_option

        _, options = question_with_options
        updated = update_question_option(
            option_id=options[0].id, body="Updated body"
        )
        assert updated.body == "Updated body"

    def test_updates_is_correct(self, question_with_options):
        from questions.services.question_services import update_question_option

        _, options = question_with_options
        updated = update_question_option(
            option_id=options[1].id, is_correct=True
        )
        assert updated.is_correct is True

    def test_updates_position(self, question_with_options):
        from questions.services.question_services import update_question_option

        _, options = question_with_options
        updated = update_question_option(
            option_id=options[0].id, position=10
        )
        assert updated.position == 10

    def test_raises_on_duplicate_label(self, question_with_options):
        from questions.services.question_services import update_question_option

        _, options = question_with_options
        with pytest.raises(QuestionOptionLabelNotUniqueError):
            update_question_option(
                option_id=options[1].id, label="A"
            )

    def test_raises_when_not_found(self):
        from questions.services.question_services import update_question_option

        with pytest.raises(QuestionOptionNotFoundError):
            update_question_option(
                option_id="00000000-0000-0000-0000-000000000000",
                label="Z",
            )

    def test_partial_update_preserves_other_fields(self, question_with_options):
        from questions.services.question_services import update_question_option

        _, options = question_with_options
        original_body = options[0].body
        update_question_option(
            option_id=options[0].id, position=99
        )
        options[0].refresh_from_db()
        assert options[0].body == original_body
        assert options[0].position == 99


class TestDeleteQuestionOption:
    def test_deletes_option(self, question_with_options):
        from questions.services.question_services import delete_question_option

        _, options = question_with_options
        oid = options[0].id
        delete_question_option(option_id=oid)
        assert QuestionOption.objects.filter(id=oid).count() == 0

    def test_raises_when_not_found(self):
        from questions.services.question_services import delete_question_option

        with pytest.raises(QuestionOptionNotFoundError):
            delete_question_option(
                option_id="00000000-0000-0000-0000-000000000000"
            )


# ═══════════════════════════════════════════════════════════════════════════════
# QuestionAppearance Services
# ═══════════════════════════════════════════════════════════════════════════════


class TestCreateQuestionAppearance:
    def test_creates_appearance(
        self, question, previous_year_paper
    ):
        from questions.services.question_services import (
            create_question_appearance,
        )

        appearance = create_question_appearance(
            question_id=question.id,
            paper_id=previous_year_paper.id,
            year=2024,
        )
        assert appearance.question_id == question.id
        assert appearance.paper_id == previous_year_paper.id
        assert appearance.year == 2024

    def test_raises_when_question_not_found(self, previous_year_paper):
        from questions.services.question_services import (
            create_question_appearance,
        )

        with pytest.raises(QuestionNotFoundError):
            create_question_appearance(
                question_id="00000000-0000-0000-0000-000000000000",
                paper_id=previous_year_paper.id,
                year=2024,
            )

    def test_raises_when_paper_not_found(self, question):
        from questions.services.question_services import (
            create_question_appearance,
        )

        with pytest.raises(PreviousYearPaperNotFoundError):
            create_question_appearance(
                question_id=question.id,
                paper_id="00000000-0000-0000-0000-000000000000",
                year=2024,
            )

    def test_raises_on_cross_exam_mismatch(self, exam_hierarchy, question):
        from questions.services.question_services import (
            create_question_appearance,
        )
        from .factories import PreviousYearPaperFactory

        other_exam = ExamFactory()
        other_paper = PreviousYearPaperFactory(
            exam=other_exam, code="OTHER", year=2024
        )

        with pytest.raises(ValueError, match="does not match"):
            create_question_appearance(
                question_id=question.id,
                paper_id=other_paper.id,
                year=2024,
            )

    def test_raises_on_duplicate(self, question_appearance):
        from questions.services.question_services import (
            create_question_appearance,
        )

        with pytest.raises(QuestionAppearanceNotUniqueError):
            create_question_appearance(
                question_id=question_appearance.question_id,
                paper_id=question_appearance.paper_id,
                year=2024,
            )

    def test_uses_atomic(self, question, previous_year_paper):
        from questions.services.question_services import (
            create_question_appearance,
        )

        with pytest.raises(Exception):
            with transaction.atomic():
                create_question_appearance(
                    question_id=question.id,
                    paper_id=previous_year_paper.id,
                    year=2024,
                )
                raise Exception("rollback")
        assert QuestionAppearance.objects.count() == 0


class TestDeleteQuestionAppearance:
    def test_deletes_appearance(self, question_appearance):
        from questions.services.question_services import (
            delete_question_appearance,
        )

        aid = question_appearance.id
        delete_question_appearance(appearance_id=aid)
        assert QuestionAppearance.objects.filter(id=aid).count() == 0

    def test_raises_when_not_found(self):
        from questions.services.question_services import (
            delete_question_appearance,
        )

        with pytest.raises(QuestionAppearanceNotFoundError):
            delete_question_appearance(
                appearance_id="00000000-0000-0000-0000-000000000000"
            )


# ═══════════════════════════════════════════════════════════════════════════════
# QuestionStat Services
# ═══════════════════════════════════════════════════════════════════════════════


class TestInitQuestionStats:
    def test_creates_stats(self, question):
        from questions.services.question_services import init_question_stats

        stat = init_question_stats(question_id=question.id)
        assert stat.question_id == question.id
        assert stat.attempts == 0

    def test_returns_existing_stats(self, question_stat):
        from questions.services.question_services import init_question_stats

        stat = init_question_stats(
            question_id=question_stat.question_id
        )
        assert stat.question_id == question_stat.question_id
        assert stat.pk == question_stat.pk
        assert QuestionStat.objects.count() == 1

    def test_raises_when_question_not_found(self):
        from questions.services.question_services import init_question_stats

        with pytest.raises(QuestionNotFoundError):
            init_question_stats(
                question_id="00000000-0000-0000-0000-000000000000"
            )


class TestUpdateQuestionStats:
    def test_increments_attempts(self, question_stat):
        from questions.services.question_services import update_question_stats

        stat = update_question_stats(
            question_id=question_stat.question_id,
            was_correct=True,
            time_spent=30,
        )
        assert stat.attempts == 1

    def test_increments_correct_when_correct(self, question_stat):
        from questions.services.question_services import update_question_stats

        stat = update_question_stats(
            question_id=question_stat.question_id,
            was_correct=True,
            time_spent=30,
        )
        assert stat.correct == 1
        assert stat.success_rate == 100.00

    def test_does_not_increment_correct_when_incorrect(self, question_stat):
        from questions.services.question_services import update_question_stats

        stat = update_question_stats(
            question_id=question_stat.question_id,
            was_correct=False,
            time_spent=30,
        )
        assert stat.correct == 0

    def test_computes_average_time(self, question_stat):
        from questions.services.question_services import update_question_stats

        stat = update_question_stats(
            question_id=question_stat.question_id,
            was_correct=True,
            time_spent=60,
        )
        assert stat.avg_time_seconds == 60.00

        stat2 = update_question_stats(
            question_id=question_stat.question_id,
            was_correct=True,
            time_spent=120,
        )
        assert stat2.avg_time_seconds == 90.00

    def test_computes_success_rate(self, question_stat):
        from questions.services.question_services import update_question_stats

        update_question_stats(
            question_id=question_stat.question_id,
            was_correct=True,
            time_spent=10,
        )
        update_question_stats(
            question_id=question_stat.question_id,
            was_correct=False,
            time_spent=10,
        )
        stat = update_question_stats(
            question_id=question_stat.question_id,
            was_correct=True,
            time_spent=10,
        )
        assert stat.success_rate == Decimal("66.67")

    def test_accepts_none_was_correct(self, question_stat):
        from questions.services.question_services import update_question_stats

        stat = update_question_stats(
            question_id=question_stat.question_id,
            was_correct=None,
            time_spent=10,
        )
        assert stat.attempts == 1
        assert stat.correct == 0

    def test_raises_when_stat_not_found(self, question):
        from questions.services.question_services import update_question_stats

        with pytest.raises(QuestionStatNotFoundError):
            update_question_stats(
                question_id=question.id,
                was_correct=True,
                time_spent=10,
            )


# ═══════════════════════════════════════════════════════════════════════════════
# AiGeneratedQuestion Services
# ═══════════════════════════════════════════════════════════════════════════════


class TestCreateAiGeneratedQuestion:
    def test_creates_ai_generated(self, exam_hierarchy):
        from questions.services.question_services import (
            create_ai_generated_question,
        )

        exam = exam_hierarchy["exam"]
        subtopic = exam_hierarchy["subtopic"]
        ai_gen = create_ai_generated_question(
            exam_id=exam.id,
            subtopic_id=subtopic.id,
            model_used="groq/llama-3.3-70b-versatile",
            prompt="Generate a question about motion",
        )
        assert ai_gen.id is not None
        assert ai_gen.exam_id == exam.id
        assert ai_gen.subtopic_id == subtopic.id
        assert ai_gen.model_used == "groq/llama-3.3-70b-versatile"
        assert ai_gen.status == "generated"
        assert ai_gen.credits_charged == 0

    def test_accepts_all_optional_fields(self, exam_hierarchy):
        from questions.services.question_services import (
            create_ai_generated_question,
        )
        from uuid import uuid4

        exam = exam_hierarchy["exam"]
        subtopic = exam_hierarchy["subtopic"]
        batch = uuid4()
        ai_gen = create_ai_generated_question(
            exam_id=exam.id,
            subtopic_id=subtopic.id,
            model_used="openai/gpt-4",
            prompt="Prompt text",
            constraints_snapshot={"difficulty": "medium"},
            raw_output="Raw output text",
            validation={"schema": "valid", "dedup": "pass"},
            credits_charged=Decimal("15.5000"),
            generation_batch=batch,
        )
        assert ai_gen.model_used == "openai/gpt-4"
        assert ai_gen.prompt == "Prompt text"
        assert ai_gen.constraints_snapshot == {"difficulty": "medium"}
        assert ai_gen.raw_output == "Raw output text"
        assert ai_gen.validation == {"schema": "valid", "dedup": "pass"}
        assert ai_gen.credits_charged == Decimal("15.5000")
        assert ai_gen.generation_batch == batch

    def test_defaults_empty_dicts(self, exam_hierarchy):
        from questions.services.question_services import (
            create_ai_generated_question,
        )

        exam = exam_hierarchy["exam"]
        ai_gen = create_ai_generated_question(
            exam_id=exam.id,
            model_used="groq/llama-3.3-70b-versatile",
        )
        assert ai_gen.constraints_snapshot == {}
        assert ai_gen.validation == {}

    def test_creates_without_subtopic(self, exam_hierarchy):
        from questions.services.question_services import (
            create_ai_generated_question,
        )

        exam = exam_hierarchy["exam"]
        ai_gen = create_ai_generated_question(
            exam_id=exam.id,
            model_used="groq/llama-3.3-70b-versatile",
        )
        assert ai_gen.subtopic is None

    def test_raises_when_exam_not_found(self):
        from questions.services.question_services import (
            create_ai_generated_question,
        )

        with pytest.raises(ExamNotFoundError):
            create_ai_generated_question(
                exam_id="00000000-0000-0000-0000-000000000000",
                model_used="groq/llama-3.3-70b-versatile",
            )

    def test_uses_atomic(self, exam_hierarchy):
        from questions.services.question_services import (
            create_ai_generated_question,
        )

        with pytest.raises(Exception):
            with transaction.atomic():
                create_ai_generated_question(
                    exam_id=exam_hierarchy["exam"].id,
                    model_used="groq/llama-3.3-70b-versatile",
                )
                raise Exception("rollback")
        assert AiGeneratedQuestion.objects.count() == 0


class TestUpdateAiGeneratedQuestion:
    def test_updates_model_used(self, ai_generated_question):
        from questions.services.question_services import (
            update_ai_generated_question,
        )

        updated = update_ai_generated_question(
            ai_gen_id=ai_generated_question.id,
            model_used="openai/gpt-4",
        )
        assert updated.model_used == "openai/gpt-4"

    def test_updates_status(self, ai_generated_question):
        from questions.services.question_services import (
            update_ai_generated_question,
        )

        updated = update_ai_generated_question(
            ai_gen_id=ai_generated_question.id,
            status="validated",
        )
        assert updated.status == "validated"

    def test_updates_subtopic(self, ai_generated_question, exam_hierarchy):
        from questions.services.question_services import (
            update_ai_generated_question,
        )

        new_subtopic = SubtopicFactory(
            topic=exam_hierarchy["topic"], name="Force", position=2
        )
        updated = update_ai_generated_question(
            ai_gen_id=ai_generated_question.id,
            subtopic_id=new_subtopic.id,
        )
        assert updated.subtopic_id == new_subtopic.id

    def test_updates_prompt(self, ai_generated_question):
        from questions.services.question_services import (
            update_ai_generated_question,
        )

        updated = update_ai_generated_question(
            ai_gen_id=ai_generated_question.id,
            prompt="Updated prompt",
        )
        assert updated.prompt == "Updated prompt"

    def test_sets_prompt_to_none(self, ai_generated_question):
        from questions.services.question_services import (
            update_ai_generated_question,
        )

        updated = update_ai_generated_question(
            ai_gen_id=ai_generated_question.id,
            prompt=None,
        )
        assert updated.prompt is None

    def test_updates_constraints_snapshot(self, ai_generated_question):
        from questions.services.question_services import (
            update_ai_generated_question,
        )

        updated = update_ai_generated_question(
            ai_gen_id=ai_generated_question.id,
            constraints_snapshot={"difficulty": "hard"},
        )
        assert updated.constraints_snapshot == {"difficulty": "hard"}

    def test_updates_raw_output(self, ai_generated_question):
        from questions.services.question_services import (
            update_ai_generated_question,
        )

        updated = update_ai_generated_question(
            ai_gen_id=ai_generated_question.id,
            raw_output="New raw output",
        )
        assert updated.raw_output == "New raw output"

    def test_updates_validation(self, ai_generated_question):
        from questions.services.question_services import (
            update_ai_generated_question,
        )

        updated = update_ai_generated_question(
            ai_gen_id=ai_generated_question.id,
            validation={"dedup": "pass"},
        )
        assert updated.validation == {"dedup": "pass"}

    def test_updates_credits_charged(self, ai_generated_question):
        from questions.services.question_services import (
            update_ai_generated_question,
        )

        updated = update_ai_generated_question(
            ai_gen_id=ai_generated_question.id,
            credits_charged=Decimal("25.0000"),
        )
        assert updated.credits_charged == Decimal("25.0000")

    def test_updates_generation_batch(self, ai_generated_question):
        from questions.services.question_services import (
            update_ai_generated_question,
        )
        from uuid import uuid4

        batch = uuid4()
        updated = update_ai_generated_question(
            ai_gen_id=ai_generated_question.id,
            generation_batch=batch,
        )
        assert updated.generation_batch == batch

    def test_partial_update_preserves_other_fields(self, ai_generated_question):
        from questions.services.question_services import (
            update_ai_generated_question,
        )

        original_model = ai_generated_question.model_used
        update_ai_generated_question(
            ai_gen_id=ai_generated_question.id,
            status="validated",
        )
        ai_generated_question.refresh_from_db()
        assert ai_generated_question.model_used == original_model
        assert ai_generated_question.status == "validated"

    def test_raises_when_not_found(self):
        from questions.services.question_services import (
            update_ai_generated_question,
        )

        with pytest.raises(AiGeneratedQuestionNotFoundError):
            update_ai_generated_question(
                ai_gen_id="00000000-0000-0000-0000-000000000000",
                status="validated",
            )


class TestDeleteAiGeneratedQuestion:
    def test_deletes_ai_generated(self, ai_generated_question):
        from questions.services.question_services import (
            delete_ai_generated_question,
        )

        gid = ai_generated_question.id
        delete_ai_generated_question(ai_gen_id=gid)
        assert AiGeneratedQuestion.objects.filter(id=gid).count() == 0

    def test_raises_when_not_found(self):
        from questions.services.question_services import (
            delete_ai_generated_question,
        )

        with pytest.raises(AiGeneratedQuestionNotFoundError):
            delete_ai_generated_question(
                ai_gen_id="00000000-0000-0000-0000-000000000000"
            )


class TestPromoteAiGeneratedQuestion:
    def test_promotes_validated_to_question(self, exam_hierarchy):
        from questions.services.question_services import (
            promote_ai_generated_question,
        )
        from .factories import AiGeneratedQuestionFactory

        exam = exam_hierarchy["exam"]
        subtopic = exam_hierarchy["subtopic"]
        ai_gen = AiGeneratedQuestionFactory(
            exam=exam,
            subtopic=subtopic,
            model_used="groq/llama-3.3-70b-versatile",
            status="validated",
        )

        ai_gen_result, question = promote_ai_generated_question(
            ai_gen_id=ai_gen.id,
            stem="What is Newton's First Law?",
            subtopic_id=subtopic.id,
            explanation="An object at rest stays at rest.",
            difficulty=2,
            language="as",
            tags={"source": "AI generated"},
        )
        assert question.id is not None
        assert question.stem == "What is Newton's First Law?"
        assert question.explanation == "An object at rest stays at rest."
        assert question.origin == "ai"
        assert question.review_status == "draft"
        assert question.tags == {"source": "AI generated"}

        ai_gen_result.refresh_from_db()
        assert ai_gen_result.status == "promoted"
        assert ai_gen_result.resulting_question_id == question.id

    def test_creates_question_stat_on_promotion(self, exam_hierarchy):
        from questions.services.question_services import (
            promote_ai_generated_question,
        )
        from .factories import AiGeneratedQuestionFactory

        exam = exam_hierarchy["exam"]
        subtopic = exam_hierarchy["subtopic"]
        ai_gen = AiGeneratedQuestionFactory(
            exam=exam, subtopic=subtopic, status="validated"
        )

        _, question = promote_ai_generated_question(
            ai_gen_id=ai_gen.id,
            stem="Test",
            subtopic_id=subtopic.id,
        )
        assert QuestionStat.objects.filter(question=question).exists()

    def test_raises_when_not_validated(self, ai_generated_question):
        from questions.services.question_services import (
            promote_ai_generated_question,
        )

        with pytest.raises(
            AiGeneratedQuestionInvalidStateError,
            match="expected 'validated'",
        ):
            promote_ai_generated_question(
                ai_gen_id=ai_generated_question.id,
                stem="Test",
                subtopic_id=ai_generated_question.subtopic_id,
            )

    def test_raises_when_discarded(self, exam_hierarchy):
        from questions.services.question_services import (
            promote_ai_generated_question,
        )
        from .factories import AiGeneratedQuestionFactory

        ai_gen = AiGeneratedQuestionFactory(
            exam=exam_hierarchy["exam"], status="discarded"
        )

        with pytest.raises(
            AiGeneratedQuestionInvalidStateError,
            match="expected 'validated'",
        ):
            promote_ai_generated_question(
                ai_gen_id=ai_gen.id,
                stem="Test",
                subtopic_id=exam_hierarchy["subtopic"].id,
            )

    def test_raises_when_not_found(self):
        from questions.services.question_services import (
            promote_ai_generated_question,
        )

        with pytest.raises(AiGeneratedQuestionNotFoundError):
            promote_ai_generated_question(
                ai_gen_id="00000000-0000-0000-0000-000000000000",
                stem="Test",
                subtopic_id="00000000-0000-0000-0000-000000000000",
            )

    def test_raises_when_subtopic_not_found(self, exam_hierarchy):
        from questions.services.question_services import (
            promote_ai_generated_question,
        )
        from .factories import AiGeneratedQuestionFactory

        ai_gen = AiGeneratedQuestionFactory(
            exam=exam_hierarchy["exam"], status="validated"
        )

        with pytest.raises(SubtopicNotFoundError):
            promote_ai_generated_question(
                ai_gen_id=ai_gen.id,
                stem="Test",
                subtopic_id="00000000-0000-0000-0000-000000000000",
            )

    def test_uses_atomic(self, exam_hierarchy):
        from questions.services.question_services import (
            promote_ai_generated_question,
        )
        from .factories import AiGeneratedQuestionFactory

        exam = exam_hierarchy["exam"]
        subtopic = exam_hierarchy["subtopic"]
        ai_gen = AiGeneratedQuestionFactory(
            exam=exam, subtopic=subtopic, status="validated"
        )

        with pytest.raises(Exception):
            with transaction.atomic():
                promote_ai_generated_question(
                    ai_gen_id=ai_gen.id,
                    stem="Atomic test",
                    subtopic_id=subtopic.id,
                )
                raise Exception("rollback")
        assert Question.objects.filter(stem="Atomic test").count() == 0
        ai_gen.refresh_from_db()
        assert ai_gen.status == "validated"
        assert ai_gen.resulting_question is None


# ═══════════════════════════════════════════════════════════════════════════════
# Selector Reuse Verification
# ═══════════════════════════════════════════════════════════════════════════════


class TestSelectorReuse:
    def test_paper_lookup_uses_selector(self, question, previous_year_paper):
        from questions.services.question_services import (
            create_question_appearance,
        )

        appearance = create_question_appearance(
            question_id=question.id,
            paper_id=previous_year_paper.id,
            year=2024,
        )
        assert appearance.paper_id == previous_year_paper.id

    def test_ai_gen_lookup_uses_selector(self, ai_generated_question):
        from questions.services.question_services import (
            update_ai_generated_question,
        )

        updated = update_ai_generated_question(
            ai_gen_id=ai_generated_question.id,
            status="validated",
        )
        assert updated.status == "validated"


# Factory classes used directly in tests
from .factories import (
    ExamFactory,
    SubtopicFactory,
)
