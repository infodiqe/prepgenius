import pytest
import json
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import UserRole, User
from accounts.tests.factories import UserFactory
from attempts.models import ExamAttempt, UserAnswer
from attempts.tests.factories import (
    ExamFactory,
    SubjectFactory,
    TopicFactory,
    SubtopicFactory,
    MockTestFactory,
    MockTestQuestionFactory,
    PublishedQuestionFactory,
    QuestionOptionFactory,
    InProgressAttemptFactory,
)
from content_review.models import ContentApproval, ContentReview
from questions.models import Question

# ═══════════════════════════════════════════════════════════════════════
# BUG #1 VERIFICATION
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
def test_verify_bug1_no_leakage(student_api_client, attempt, question_with_options):
    """Verifies Bug #1 is fixed: is_correct MUST NOT leak mid-attempt."""
    client = student_api_client
    question, options = question_with_options
    correct_option = next(o for o in options if o.is_correct)

    # 1. Verify attempt is in-progress
    assert attempt.status == "in_progress"

    # 2. Student saves the correct answer
    save_url = reverse("attempts:answer-save", kwargs={"attempt_pk": attempt.id})
    save_data = {
        "question_id": str(question.id),
        "selected_option_id": str(correct_option.id),
        "state": "answered",
        "time_spent_seconds": 12
    }
    
    save_resp = client.post(save_url, save_data, format="json")
    assert save_resp.status_code == 200
    assert "is_correct" not in save_resp.data

    # 3. Student fetches the attempt detail (mid-attempt GET /attempts/{id}/)
    detail_url = reverse("attempts:attempt-detail", kwargs={"pk": attempt.id})
    detail_resp = client.get(detail_url)
    assert detail_resp.status_code == 200
    
    answers = detail_resp.data["answers"]
    
    # 4. Assert correctness has NOT leaked
    has_leak = any("is_correct" in ans for ans in answers)
    print(f"Verification - is_correct present in answers: {has_leak}")
    assert not has_leak, "Bug #1: is_correct leaked mid-attempt!"


# ═══════════════════════════════════════════════════════════════════════
# BUG #2 VERIFICATION
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
def test_verify_bug2_sme_bypass_blocked(seed_roles):
    """Verifies Bug #2 is fixed: reviewer can no longer approve from sme_review."""
    role_map, _ = seed_roles
    
    # Create content reviewer
    reviewer_user = UserFactory(is_email_verified=True, status="active")
    UserRole.objects.create(user=reviewer_user, role=role_map["content_reviewer"])
    
    # Create an AI-origin question (which requires strict SME approval to publish)
    exam = ExamFactory(code="AI_EXAM", name="AI Exam", exam_type="qualifying")
    subject = SubjectFactory(exam=exam, name="Subject")
    topic = TopicFactory(subject=subject, name="Topic")
    subtopic = SubtopicFactory(topic=topic, name="Subtopic")
    
    question = PublishedQuestionFactory(
        exam=exam,
        subtopic=subtopic,
        origin="ai",
        review_status="sme_review"
    )
    QuestionOptionFactory(question=question, label="A", body="Yes", is_correct=True)
    
    # Set up reviewer client
    reviewer_client = APIClient()
    refresh = RefreshToken.for_user(reviewer_user)
    reviewer_client.cookies["access_token"] = str(refresh.access_token)
    reviewer_client.cookies["refresh_token"] = str(refresh)
    reviewer_client.user = reviewer_user
    
    # Call the /approve/ endpoint as the Reviewer (reviewer role!)
    approve_url = reverse("content_review:question-approve", kwargs={"question_pk": question.id})
    approve_resp = reviewer_client.post(approve_url, {"comment": "Attempting to bypass SME approval"}, format="json")
    
    # Assert that standard reviewer approve request is blocked (400 Bad Request)
    assert approve_resp.status_code == 400
    
    # Fetch database state for question review_status - should remain 'sme_review'
    question.refresh_from_db()
    assert question.review_status == "sme_review"


# ═══════════════════════════════════════════════════════════════════════
# BUG #3 VERIFICATION
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
def test_verify_bug3_inactive_exam_filtered(student_api_client):
    """Verifies Bug #3 is fixed: Inactive exams are excluded from student list."""
    client = student_api_client
    
    # Seed active and inactive exams
    active_exam = ExamFactory(code="ACTIVE_EXAM", name="Active Exam", is_active=True)
    inactive_exam = ExamFactory(code="INACTIVE_EXAM", name="Inactive Exam", is_active=False)
    
    # Fetch exam list via student API
    list_url = reverse("exams:exam-list")
    resp = client.get(list_url)
    assert resp.status_code == 200
    
    returned_codes = [e["code"] for e in resp.data]
    print(f"Returned Exam Codes: {returned_codes}")
    
    assert "ACTIVE_EXAM" in returned_codes
    assert "INACTIVE_EXAM" not in returned_codes, "Bug #3: Inactive exam visible to student!"


# ═══════════════════════════════════════════════════════════════════════
# BUG #4 VERIFICATION
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
def test_verify_bug4_concurrency_race_resolved(student_api_client, attempt, question_with_options):
    """Verifies Bug #4 is fixed: race condition is serialized and status transitions are guarded."""
    client = student_api_client
    question, options = question_with_options
    correct_option = options[0]
    
    UserAnswer.objects.create(
        attempt=attempt,
        question=question,
        selected_option=correct_option,
        state="answered"
    )
    
    from django.db import transaction
    from django.utils import timezone
    from attempts.exceptions import InvalidAttemptTransitionError
    from attempts.services.attempt_services import submit_attempt, score_attempt
    
    # 1. Sweep processes the attempt, transitions to scored
    with transaction.atomic():
        sweep_attempt = ExamAttempt.objects.select_for_update().get(id=attempt.id)
        assert sweep_attempt.status == "in_progress"
        submit_attempt(attempt_id=attempt.id)
        
    attempt.refresh_from_db()
    assert attempt.status == "scored"
    
    # 2. Student attempts concurrent submit using stale in-memory read (which had status in_progress).
    # Since the state machine transition is checked inside submit_attempt under row lock,
    # the transition scored -> submitted is invalid and must throw InvalidAttemptTransitionError.
    with pytest.raises(InvalidAttemptTransitionError):
        with transaction.atomic():
            submit_attempt(attempt_id=attempt.id)
            
    attempt.refresh_from_db()
    assert attempt.status == "scored"  # Must remain scored, no regression to submitted!
