
import os
import django
import json
from django.utils import timezone
from django.db import transaction

# Initialize Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
django.setup()

from accounts.models import UserRole
from accounts.tests.factories import UserFactory
from attempts.models import ExamAttempt, UserAnswer
from attempts.tests.factories import (
    ExamFactory,
    PublishedQuestionFactory,
    QuestionOptionFactory,
    InProgressAttemptFactory,
)
from attempts.services.attempt_services import submit_attempt, score_attempt
from analytics.models import AttemptSectionAnalytics
from reproduce_bug1 import local_seed_roles

def run_reproduction():
    print("=== REPRODUCING BUG #4: CONCURRENCY RACE CONDITION ===")
    
    # 1. Setup roles and create student
    role_map = local_seed_roles()
    student = UserFactory(is_email_verified=True, status="active")
    UserRole.objects.create(user=student, role=role_map["student"])
    
    # Seed active attempt
    exam = ExamFactory(code="BUG4_EXAM", name="Bug #4 Exam", is_active=True)
    question = PublishedQuestionFactory(exam=exam)
    option = QuestionOptionFactory(question=question, is_correct=True)
    attempt = InProgressAttemptFactory(user=student, exam=exam, total_questions=1)
    
    # Save student answer
    UserAnswer.objects.create(
        attempt=attempt,
        question=question,
        selected_option=option,
        state="answered"
    )
    
    print(f"Attempt created: ID={attempt.id}, Status={attempt.status}")
    
    # 2. Simulate sweep thread taking a row lock and submitting/scoring the attempt
    print("Action (Sweep): Locks row, submits and scores attempt.")
    with transaction.atomic():
        sweep_attempt = ExamAttempt.objects.select_for_update().get(id=attempt.id)
        assert sweep_attempt.status == "in_progress"
        submit_attempt(attempt_id=attempt.id)
        
    attempt.refresh_from_db()
    print(f"Database Attempt Status after sweep finalization: {attempt.status}")
    
    # 3. Simulate concurrent student thread that already had status='in_progress' in memory,
    # and now updates status to 'submitted' without a lock
    print("Action (Student): Overwrites status back to 'submitted' using stale in-memory read.")
    with transaction.atomic():
        attempt.status = "submitted"
        attempt.submitted_at = timezone.now()
        attempt.save(update_fields=["status", "submitted_at"])
        
    attempt.refresh_from_db()
    print(f"Database Attempt Status after student stale overwrite: {attempt.status}")
    
    # 4. Student thread triggers score_attempt
    print("Action (Student): Student calls score_attempt on the overwritten status.")
    try:
        score_attempt(attempt_id=attempt.id)
    except Exception as e:
        print(f"Scoring threw exception: {type(e).__name__}: {e}")
        
    attempt.refresh_from_db()
    print(f"Final Database Attempt Status: {attempt.status}")
    print(f"Was attempt double-finalized? {attempt.status == 'scored'}")
    
    # Check if analytics rows were duplicated
    analytics_count = AttemptSectionAnalytics.objects.filter(attempt_id=attempt.id).count()
    print(f"AttemptSectionAnalytics rows in DB: {analytics_count} (Expected unique sections only)")
    
    if attempt.status == "scored" and analytics_count > 1:
        print("RESULT: Bug #4 is CONFIRMED! Concurrency race allowed regression to 'submitted' and double-finalization/duplicate analytics.")
    else:
        print("RESULT: Bug #4 not reproduced.")

if __name__ == "__main__":
    run_reproduction()
