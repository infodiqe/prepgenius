"""PH-3 admin tests: Admin Publish Protection.

QuestionAdminForm must reject status changes that bypass the review state
machine or the publish policy, and QuestionAdmin.save_model must route accepted
status changes through the guarded service (so the content_reviews audit trail
is written rather than a raw field update).
"""
import pytest
from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory

from accounts.models import User
from content_review.models import ContentApproval, ContentReview
from questions.admin import QuestionAdmin, QuestionAdminForm
from questions.models import Question
from questions.services.question_services import update_question_review_status

from .factories import QuestionFactory

pytestmark = pytest.mark.django_db


def _form_data(question, **overrides):
    data = {
        "exam": str(question.exam_id),
        "subtopic": str(question.subtopic_id),
        "stem": question.stem,
        "explanation": question.explanation or "",
        "difficulty": question.difficulty,
        "language": question.language,
        "origin": question.origin,
        "review_status": question.review_status,
        "verified_by": "",
        "claimed_by": "",
        # JSONField treats an empty dict as an empty value; use a non-empty
        # payload so binding doesn't fail on the unrelated required-field check.
        "tags": '{"source": "test"}',
    }
    data.update(overrides)
    return data


def _approve(question, *, via_sme=False):
    update_question_review_status(question_id=question.id, review_status="in_review")
    if via_sme:
        update_question_review_status(question_id=question.id, review_status="sme_review")
        update_question_review_status(
            question_id=question.id, review_status="approved", actor_role="sme"
        )
    else:
        update_question_review_status(
            question_id=question.id, review_status="approved", actor_role="content_reviewer"
        )
    question.refresh_from_db()


class TestQuestionAdminFormGuard:
    def test_blocks_direct_draft_to_published(self, draft_question):
        form = QuestionAdminForm(
            data=_form_data(draft_question, review_status="published"),
            instance=draft_question,
        )
        assert not form.is_valid()
        assert "review_status" in form.errors

    def test_blocks_skipping_states(self, draft_question):
        # draft → approved is not a legal single transition.
        form = QuestionAdminForm(
            data=_form_data(draft_question, review_status="approved"),
            instance=draft_question,
        )
        assert not form.is_valid()
        assert "review_status" in form.errors

    def test_blocks_publish_without_required_approval(self, draft_question):
        _approve(draft_question)
        ContentApproval.objects.filter(question_id=draft_question.id).delete()

        form = QuestionAdminForm(
            data=_form_data(draft_question, review_status="published"),
            instance=draft_question,
        )
        assert not form.is_valid()
        assert "review_status" in form.errors

    def test_blocks_publish_of_ai_content_with_reviewer_only(self, exam_hierarchy):
        q = QuestionFactory(
            ai=True,
            exam=exam_hierarchy["exam"],
            subtopic=exam_hierarchy["subtopic"],
        )
        _approve(q, via_sme=False)  # reviewer-level only; AI needs SME

        form = QuestionAdminForm(
            data=_form_data(q, review_status="published"), instance=q
        )
        assert not form.is_valid()
        assert "review_status" in form.errors

    def test_allows_valid_publish_of_approved_question(self, draft_question):
        _approve(draft_question)  # reviewer approval, default policy
        form = QuestionAdminForm(
            data=_form_data(draft_question, review_status="published"),
            instance=draft_question,
        )
        assert form.is_valid(), form.errors

    def test_allows_legal_forward_transition(self, draft_question):
        form = QuestionAdminForm(
            data=_form_data(draft_question, review_status="in_review"),
            instance=draft_question,
        )
        assert form.is_valid(), form.errors


class TestQuestionAdminSaveModel:
    def _admin(self):
        return QuestionAdmin(Question, AdminSite())

    def _superuser(self):
        return User.objects.create_superuser(
            email="admin-ph3@example.com", password="x", full_name="Admin"
        )

    def test_publish_via_admin_routes_through_service_and_audits(self, draft_question):
        _approve(draft_question)
        admin = self._admin()
        user = self._superuser()

        form = QuestionAdminForm(
            data=_form_data(draft_question, review_status="published"),
            instance=draft_question,
        )
        assert form.is_valid(), form.errors

        request = RequestFactory().post("/")
        request.user = user
        admin.save_model(request, form.instance, form, change=True)

        draft_question.refresh_from_db()
        assert draft_question.review_status == "published"
        # Audit row written by the service (not a raw field update).
        assert ContentReview.objects.filter(
            question_id=draft_question.id, action="publish"
        ).exists()
