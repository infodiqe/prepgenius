import pytest
import json
import secrets
from datetime import timedelta
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User, UserRole, Role, Permission, RolePermission, EmailVerificationToken
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
from questions.models import Question, QuestionOption

# ═══════════════════════════════════════════════════════════════════════
# PHASE 1 P0 TEST RUNNER (CORRECTED URLS)
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestPhase1P0Suite:

    @pytest.fixture(autouse=True)
    def setup_suite(self, seed_roles):
        self.role_map, self.perm_map = seed_roles
        self.client = APIClient()

    def test_sj_01_registration(self):
        print("\n=== SJ-01: Registration (P0) ===")
        url = reverse("auth-register")
        data = {
            "email": "register_p0@prepgenius.ai",
            "full_name": "P0 Student",
            "password": "Password123!",
            "password_confirm": "Password123!"
        }
        print(f"Request: POST {url}")
        print(f"Payload: {json.dumps(data)}")
        
        resp = self.client.post(url, data, format="json")
        print(f"Response Status: {resp.status_code}")
        print(f"Response Body: {json.dumps(resp.data)}")
        
        assert resp.status_code == status.HTTP_201_CREATED
        
        user = User.objects.get(email="register_p0@prepgenius.ai")
        print(f"Database State - User status: {user.status}, is_email_verified: {user.is_email_verified}")
        
        assert user.status == "pending"
        assert not user.is_email_verified
        assert EmailVerificationToken.objects.filter(user=user, is_used=False).exists()
        print("SJ-01 RESULT: PASS")

    def test_sj_02_email_verification(self):
        print("\n=== SJ-02: Email verification (P0) ===")
        user = UserFactory(email="verify_p0@prepgenius.ai", is_email_verified=False, status="pending")
        token = EmailVerificationToken.objects.create(
            user=user,
            token="token_p0_123",
            expires_at=timezone.now() + timedelta(hours=24)
        )
        
        url = reverse("auth-verify-email")
        data = {"token": token.token}
        print(f"Request: POST {url}")
        print(f"Payload: {json.dumps(data)}")
        
        resp = self.client.post(url, data, format="json")
        print(f"Response Status: {resp.status_code}")
        print(f"Response Body: {json.dumps(resp.data)}")
        
        assert resp.status_code == status.HTTP_200_OK
        
        user.refresh_from_db()
        token.refresh_from_db()
        print(f"Database State - User status: {user.status}, is_email_verified: {user.is_email_verified}, token.is_used: {token.is_used}")
        
        assert user.is_email_verified
        assert user.status == "active"
        assert token.is_used
        print("SJ-02 RESULT: PASS")

    def test_sj_03_and_sec_05_login_cookies(self):
        print("\n=== SJ-03 & SEC-05: Login & Session Cookies (P0) ===")
        student = UserFactory(email="login_p0@prepgenius.ai", is_email_verified=True, status="active")
        student.set_password("Password123!")
        student.save()
        UserRole.objects.create(user=student, role=self.role_map["student"])
        
        url = reverse("auth-login")
        data = {"email": "login_p0@prepgenius.ai", "password": "Password123!"}
        print(f"Request: POST {url}")
        print(f"Payload: {json.dumps(data)}")
        
        resp = self.client.post(url, data, format="json")
        print(f"Response Status: {resp.status_code}")
        print(f"Response Body: {json.dumps(resp.data)}")
        print(f"Response Cookies: {resp.cookies}")
        
        assert resp.status_code == status.HTTP_200_OK
        assert "access_token" in resp.cookies
        assert "refresh_token" in resp.cookies
        
        access_cookie = resp.cookies["access_token"]
        assert access_cookie["httponly"]
        assert access_cookie["secure"]
        assert access_cookie["samesite"] == "Lax"
        assert "access_token" not in resp.data
        print("SJ-03 & SEC-05 RESULT: PASS")

    def test_sec_11_auth_required(self):
        print("\n=== SEC-11: Auth required (P0) ===")
        url = reverse("attempts:attempt-list")
        print(f"Request: GET {url}")
        
        resp = self.client.get(url)
        print(f"Response Status: {resp.status_code}")
        
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED
        print("SEC-11 RESULT: PASS")

    def test_sec_06_logout_revokes(self):
        print("\n=== SEC-06: Logout revokes (P0) ===")
        student = UserFactory(is_email_verified=True, status="active")
        UserRole.objects.create(user=student, role=self.role_map["student"])
        
        refresh = RefreshToken.for_user(student)
        self.client.cookies["access_token"] = str(refresh.access_token)
        self.client.cookies["refresh_token"] = str(refresh)
        
        url = reverse("auth-logout")
        print(f"Request: POST {url}")
        
        resp = self.client.post(url)
        print(f"Response Status: {resp.status_code}")
        
        assert resp.status_code == status.HTTP_200_OK
        
        # Verify old refresh token is blacklisted
        refresh_url = reverse("auth-token-refresh")
        self.client.cookies["refresh_token"] = str(refresh)
        print(f"Request with old refresh: POST {refresh_url}")
        
        refresh_resp = self.client.post(refresh_url)
        print(f"Response Status: {refresh_resp.status_code}")
        
        assert refresh_resp.status_code == status.HTTP_401_UNAUTHORIZED
        print("SEC-06 RESULT: PASS")

    def test_sj_06_exam_published_questions_only(self):
        print("\n=== SJ-06: Exam & Published Questions Only (P0) ===")
        student = UserFactory(is_email_verified=True, status="active")
        UserRole.objects.create(user=student, role=self.role_map["student"])
        refresh = RefreshToken.for_user(student)
        self.client.cookies["access_token"] = str(refresh.access_token)
        
        # Seed exams
        active_exam = ExamFactory(code="P0_ACTIVE", is_active=True)
        inactive_exam = ExamFactory(code="P0_INACTIVE", is_active=False)
        
        # Seed questions
        subject = SubjectFactory(exam=active_exam)
        topic = TopicFactory(subject=subject)
        subtopic = SubtopicFactory(topic=topic)
        
        q_published = PublishedQuestionFactory(exam=active_exam, subtopic=subtopic, review_status="published")
        q_draft = PublishedQuestionFactory(exam=active_exam, subtopic=subtopic, review_status="draft")
        
        # 1. Fetch exams list (should only show active)
        exams_url = reverse("exams:exam-list")
        print(f"Request: GET {exams_url}")
        exams_resp = self.client.get(exams_url)
        print(f"Response Body: {json.dumps(exams_resp.data)}")
        
        active_codes = [e["code"] for e in exams_resp.data]
        
        # We handle this assertion programmatically to log the Bug #3 check status
        has_inactive_leak = "P0_INACTIVE" in active_codes
        print(f"Inactive exam visible to student: {has_inactive_leak}")
        if has_inactive_leak:
            print("[BUG #3 DETECTED] - Inactive exams returned in list.")
            assert False, "Bug #3 Inactive Exam Leakage is present!"
            
        # 2. Fetch published questions
        q_url = reverse("questions:published-question-list") + f"?exam_id={active_exam.id}"
        print(f"Request: GET {q_url}")
        q_resp = self.client.get(q_url)
        print(f"Response count: {len(q_resp.data)}")
        
        question_ids = [q["id"] for q in q_resp.data]
        assert str(q_published.id) in question_ids
        assert str(q_draft.id) not in question_ids
        print("SJ-06 RESULT: PASS")

    def test_sj_07_start_mock_test(self):
        print("\n=== SJ-07: Start mock test (P0) ===")
        student = UserFactory(is_email_verified=True, status="active")
        UserRole.objects.create(user=student, role=self.role_map["student"])
        refresh = RefreshToken.for_user(student)
        self.client.cookies["access_token"] = str(refresh.access_token)
        
        exam = ExamFactory(is_active=True)
        mock_test = MockTestFactory(exam=exam, is_published=True, duration_seconds=1800)
        
        create_url = reverse("attempts:attempt-list")
        create_data = {
            "exam_id": str(exam.id),
            "attempt_type": "full_mock",
            "mock_test_id": str(mock_test.id)
        }
        print(f"Request (Create): POST {create_url} payload={json.dumps(create_data)}")
        create_resp = self.client.post(create_url, create_data, format="json")
        print(f"Response status: {create_resp.status_code}")
        
        attempt_id = create_resp.data["id"]
        
        start_url = reverse("attempts:attempt-start", kwargs={"pk": attempt_id})
        print(f"Request (Start): POST {start_url}")
        start_resp = self.client.post(start_url)
        print(f"Response status: {start_resp.status_code}")
        print(f"Response Body: {json.dumps(start_resp.data, indent=2)}")
        
        assert start_resp.status_code == status.HTTP_200_OK
        assert start_resp.data["status"] == "in_progress"
        assert start_resp.data["started_at"] is not None
        assert start_resp.data["duration_seconds"] == 1800
        print("SJ-07 RESULT: PASS")

    def test_sj_08_save_answer(self):
        print("\n=== SJ-08: Save answer (P0) ===")
        student = UserFactory(is_email_verified=True, status="active")
        UserRole.objects.create(user=student, role=self.role_map["student"])
        refresh = RefreshToken.for_user(student)
        self.client.cookies["access_token"] = str(refresh.access_token)
        
        exam = ExamFactory(is_active=True)
        question = PublishedQuestionFactory(exam=exam)
        option = QuestionOptionFactory(question=question)
        
        attempt = InProgressAttemptFactory(user=student, exam=exam)
        
        url = reverse("attempts:answer-save", kwargs={"attempt_pk": attempt.id})
        data = {
            "question_id": str(question.id),
            "selected_option_id": str(option.id),
            "state": "answered",
            "time_spent_seconds": 20
        }
        print(f"Request: POST {url}")
        
        resp = self.client.post(url, data, format="json")
        print(f"Response Status: {resp.status_code}")
        print(f"Response Body: {json.dumps(resp.data)}")
        
        assert resp.status_code == status.HTTP_200_OK
        assert "is_correct" not in resp.data
        print("SJ-08 RESULT: PASS")

    def test_sj_10_submit_attempt(self):
        print("\n=== SJ-10: Submit attempt (P0) ===")
        student = UserFactory(is_email_verified=True, status="active")
        UserRole.objects.create(user=student, role=self.role_map["student"])
        refresh = RefreshToken.for_user(student)
        self.client.cookies["access_token"] = str(refresh.access_token)
        
        exam = ExamFactory(is_active=True)
        attempt = InProgressAttemptFactory(user=student, exam=exam)
        
        url = reverse("attempts:attempt-submit", kwargs={"pk": attempt.id})
        print(f"Request: POST {url}")
        
        resp = self.client.post(url)
        print(f"Response Status: {resp.status_code}")
        print(f"Response Body: {json.dumps(resp.data)}")
        
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "scored"
        assert resp.data["submitted_at"] is not None
        print("SJ-10 RESULT: PASS")

    def test_sj_11_and_ops_03_auto_submit(self):
        print("\n=== SJ-11 & OPS-03: Auto-submit on expiry (P0) ===")
        from attempts.services.attempt_services import submit_expired_attempts
        
        student = UserFactory(is_email_verified=True, status="active")
        exam = ExamFactory(is_active=True)
        attempt = InProgressAttemptFactory(user=student, exam=exam, duration_seconds=1200)
        
        # Set started_at back by 1300 seconds (expired!)
        attempt.started_at = timezone.now() - timedelta(seconds=1300)
        attempt.save()
        
        print(f"Expired attempt seeded: ID={attempt.id}, started_at={attempt.started_at}")
        
        # Run sweep
        count = submit_expired_attempts()
        print(f"Sweep finalized count: {count}")
        
        attempt.refresh_from_db()
        print(f"Attempt Status after sweep: {attempt.status}")
        
        assert count == 1
        assert attempt.status == "scored"
        print("SJ-11 & OPS-03 RESULT: PASS")

    def test_sj_12_and_ei_06_results_view(self):
        print("\n=== SJ-12 & EI-06: Scored Results View & Correctness Revealed (P0) ===")
        student = UserFactory(is_email_verified=True, status="active")
        UserRole.objects.create(user=student, role=self.role_map["student"])
        refresh = RefreshToken.for_user(student)
        self.client.cookies["access_token"] = str(refresh.access_token)
        
        exam = ExamFactory(is_active=True)
        question = PublishedQuestionFactory(exam=exam)
        option = QuestionOptionFactory(question=question, is_correct=True)
        attempt = InProgressAttemptFactory(user=student, exam=exam, total_questions=1)
        
        # Create answer with correct marker set explicitly (simulating scored database state)
        UserAnswer.objects.create(
            attempt=attempt,
            question=question,
            selected_option=option,
            state="answered",
            is_correct=True
        )
        
        # Submit to score
        submit_url = reverse("attempts:attempt-submit", kwargs={"pk": attempt.id})
        self.client.post(submit_url)
        
        # Fetch scored results
        detail_url = reverse("attempts:attempt-detail", kwargs={"pk": attempt.id})
        print(f"Request: GET {detail_url}")
        
        resp = self.client.get(detail_url)
        print(f"Response Status: {resp.status_code}")
        print(f"Response Data: {json.dumps(resp.data, indent=2)}")
        
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "scored"
        assert resp.data["score"] is not None
        assert "is_correct" in resp.data["answers"][0]
        assert resp.data["answers"][0]["is_correct"] is True
        print("SJ-12 & EI-06 RESULT: PASS")

    def test_ei_01_no_mid_exam_leakage(self):
        print("\n=== EI-01: No Mid-Exam Leakage (P0) ===")
        student = UserFactory(is_email_verified=True, status="active")
        UserRole.objects.create(user=student, role=self.role_map["student"])
        refresh = RefreshToken.for_user(student)
        self.client.cookies["access_token"] = str(refresh.access_token)
        
        exam = ExamFactory(is_active=True)
        question = PublishedQuestionFactory(exam=exam)
        option = QuestionOptionFactory(question=question, is_correct=True)
        attempt = InProgressAttemptFactory(user=student, exam=exam)
        
        # Save answer
        save_url = reverse("attempts:answer-save", kwargs={"attempt_pk": attempt.id})
        self.client.post(save_url, {"question_id": str(question.id), "selected_option_id": str(option.id), "state": "answered"})
        
        # GET attempt detail
        detail_url = reverse("attempts:attempt-detail", kwargs={"pk": attempt.id})
        resp = self.client.get(detail_url)
        
        has_leak = "is_correct" in resp.data["answers"][0]
        print(f"Is correctness present in response payload? {has_leak}")
        
        if has_leak:
            print("[BUG #1 DETECTED] - Correctness leaks in active attempt detail GET response.")
            assert False, "Bug #1 Answer Leakage is present!"
            
        print("EI-01 RESULT: PASS")

    def test_ei_02_option_masking(self):
        print("\n=== EI-02: Option Masking (P0) ===")
        student = UserFactory(is_email_verified=True, status="active")
        UserRole.objects.create(user=student, role=self.role_map["student"])
        refresh = RefreshToken.for_user(student)
        self.client.cookies["access_token"] = str(refresh.access_token)
        
        exam = ExamFactory(is_active=True)
        question = PublishedQuestionFactory(exam=exam)
        QuestionOptionFactory(question=question, is_correct=True)
        
        url = reverse("questions:published-question-detail", kwargs={"pk": question.id})
        print(f"Request: GET {url}")
        
        resp = self.client.get(url)
        print(f"Response Status: {resp.status_code}")
        
        for opt in resp.data["options"]:
            assert "is_correct" not in opt
            
        print("EI-02 RESULT: PASS")

    def test_ei_03_explanation_masking(self):
        print("\n=== EI-03: Explanation Masking (P0) ===")
        student = UserFactory(is_email_verified=True, status="active")
        UserRole.objects.create(user=student, role=self.role_map["student"])
        refresh = RefreshToken.for_user(student)
        self.client.cookies["access_token"] = str(refresh.access_token)
        
        exam = ExamFactory(is_active=True)
        question = PublishedQuestionFactory(exam=exam, explanation="This is the answer key.")
        
        url = reverse("questions:published-question-detail", kwargs={"pk": question.id})
        print(f"Request: GET {url}")
        
        resp = self.client.get(url)
        print(f"Response Status: {resp.status_code}")
        
        assert "explanation" not in resp.data
        print("EI-03 RESULT: PASS")

    def test_ei_04_student_content_block(self):
        print("\n=== EI-04: Student Content Block (P0) ===")
        student = UserFactory(is_email_verified=True, status="active")
        UserRole.objects.create(user=student, role=self.role_map["student"])
        refresh = RefreshToken.for_user(student)
        self.client.cookies["access_token"] = str(refresh.access_token)
        
        exam = ExamFactory(is_active=True)
        question = PublishedQuestionFactory(exam=exam, explanation="Answers inside!")
        
        url = reverse("questions:question-detail", kwargs={"pk": question.id})
        print(f"Request: GET {url}")
        
        resp = self.client.get(url)
        print(f"Response Status: {resp.status_code}")
        
        assert "explanation" not in resp.data
        print("EI-04 RESULT: PASS")

    def test_ei_05_draft_404_hide(self):
        print("\n=== EI-05: Draft 404 Hide (P0) ===")
        student = UserFactory(is_email_verified=True, status="active")
        UserRole.objects.create(user=student, role=self.role_map["student"])
        refresh = RefreshToken.for_user(student)
        self.client.cookies["access_token"] = str(refresh.access_token)
        
        exam = ExamFactory(is_active=True)
        question = PublishedQuestionFactory(exam=exam, review_status="draft")
        
        url = reverse("questions:published-question-detail", kwargs={"pk": question.id})
        print(f"Request: GET {url}")
        
        resp = self.client.get(url)
        print(f"Response Status: {resp.status_code}")
        
        assert resp.status_code == status.HTTP_404_NOT_FOUND
        print("EI-05 RESULT: PASS")

    def test_sec_01_and_sec_02_and_sec_04_lockout(self):
        print("\n=== SEC-01 & SEC-02 & SEC-04: Lockout Lifecycle (P0) ===")
        student = UserFactory(email="lock_p0@prepgenius.ai", is_email_verified=True, status="active")
        student.set_password("CorrectPW123")
        student.save()
        UserRole.objects.create(user=student, role=self.role_map["student"])
        
        url = reverse("auth-login")
        
        # 1. First 4 bad passwords
        for i in range(4):
            resp = self.client.post(url, {"email": "lock_p0@prepgenius.ai", "password": "WrongPassword"})
            assert resp.status_code == status.HTTP_401_UNAUTHORIZED
            
        # 2. 5th bad password triggers lockout
        resp = self.client.post(url, {"email": "lock_p0@prepgenius.ai", "password": "WrongPassword"})
        print(f"5th Response Status: {resp.status_code}")
        assert resp.status_code == status.HTTP_423_LOCKED
        
        # 3. SEC-02: Correct password fails during lockout
        resp = self.client.post(url, {"email": "lock_p0@prepgenius.ai", "password": "CorrectPW123"})
        assert resp.status_code == status.HTTP_423_LOCKED
        
        # 4. SEC-04: Non-existent user lockout verification
        resp = self.client.post(url, {"email": "nobody_p0@prepgenius.ai", "password": "WrongPassword"})
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED
        print("SEC-01 & SEC-02 & SEC-04 RESULT: PASS")

    def test_sec_08_cross_tenant_block(self):
        print("\n=== SEC-08: Tenant Cross-Access Block (P0) ===")
        student1 = UserFactory(is_email_verified=True, status="active")
        student2 = UserFactory(is_email_verified=True, status="active")
        UserRole.objects.create(user=student1, role=self.role_map["student"])
        UserRole.objects.create(user=student2, role=self.role_map["student"])
        
        exam = ExamFactory(is_active=True)
        attempt1 = InProgressAttemptFactory(user=student1, exam=exam)
        
        # Authenticate S2
        refresh2 = RefreshToken.for_user(student2)
        self.client.cookies["access_token"] = str(refresh2.access_token)
        
        url = reverse("attempts:attempt-detail", kwargs={"pk": attempt1.id})
        print(f"Request: GET {url}")
        
        resp = self.client.get(url)
        print(f"Response Status: {resp.status_code}")
        
        assert resp.status_code == status.HTTP_404_NOT_FOUND
        print("SEC-08 RESULT: PASS")

    def test_sec_09_student_rbac_block(self):
        print("\n=== SEC-09: Student RBAC Block (P0) ===")
        student = UserFactory(is_email_verified=True, status="active")
        UserRole.objects.create(user=student, role=self.role_map["student"])
        refresh = RefreshToken.for_user(student)
        self.client.cookies["access_token"] = str(refresh.access_token)
        
        exam = ExamFactory(is_active=True)
        subject = SubjectFactory(exam=exam)
        topic = TopicFactory(subject=subject)
        subtopic = SubtopicFactory(topic=topic)
        
        url = reverse("questions:question-list")
        data = {
            "exam_id": str(exam.id),
            "subtopic_id": str(subtopic.id),
            "stem": "Hacked stem"
        }
        print(f"Request: POST {url}")
        
        resp = self.client.post(url, data, format="json")
        print(f"Response Status: {resp.status_code}")
        
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        print("SEC-09 RESULT: PASS")

    def test_cw_08_ai_draft_origin(self):
        print("\n=== CW-08: AI Draft Origin Lock (P0) ===")
        exam = ExamFactory(is_active=True)
        from questions.models import AiGeneratedQuestion
        ai_gen = AiGeneratedQuestion.objects.create(
            exam=exam,
            model_used="gpt-4o-mini",
            prompt="Write a math question",
            raw_output='{"stem": "Calculate 5*5", "options": [{"label":"A","body":"25","is_correct":true}]}',
            status="validated"
        )
        
        from questions.services.question_services import promote_ai_generated_question
        _, question = promote_ai_generated_question(
            ai_gen_id=ai_gen.id,
            stem="Calculate 5*5",
            subtopic_id=SubtopicFactory(topic=TopicFactory(subject=SubjectFactory(exam=exam))).id
        )
        
        assert question.review_status == "draft"
        assert question.origin == "ai"
        print("CW-08 RESULT: PASS")

    def test_cw_01_happy_path(self):
        print("\n=== CW-01: Happy Path Workflow (P0) ===")
        reviewer = UserFactory(is_email_verified=True, status="active")
        manager = UserFactory(is_email_verified=True, status="active")
        UserRole.objects.create(user=reviewer, role=self.role_map["content_reviewer"])
        UserRole.objects.create(user=manager, role=self.role_map["content_manager"])
        
        exam = ExamFactory(is_active=True)
        question = PublishedQuestionFactory(exam=exam, review_status="draft")
        QuestionOptionFactory(question=question, is_correct=True)
        
        # 1. Reviewer claims
        url_claim = reverse("content_review:claim-question", kwargs={"question_pk": question.id})
        self.client.cookies["access_token"] = str(RefreshToken.for_user(reviewer).access_token)
        claim_resp = self.client.post(url_claim)
        assert claim_resp.status_code == status.HTTP_200_OK
        
        # 2. Reviewer submits
        url_submit = reverse("content_review:question-submit", kwargs={"question_pk": question.id})
        sub_resp = self.client.post(url_submit)
        assert sub_resp.status_code == status.HTTP_200_OK
        
        # 3. Reviewer approves
        url_approve = reverse("content_review:question-approve", kwargs={"question_pk": question.id})
        app_resp = self.client.post(url_approve)
        assert app_resp.status_code == status.HTTP_200_OK
        
        # 4. Manager publishes
        self.client.cookies["access_token"] = str(RefreshToken.for_user(manager).access_token)
        url_publish = reverse("content_review:question-publish", kwargs={"question_pk": question.id})
        pub_resp = self.client.post(url_publish)
        assert pub_resp.status_code == status.HTTP_200_OK
        
        question.refresh_from_db()
        assert question.review_status == "published"
        print("CW-01 RESULT: PASS")

    def test_cw_03_direct_publish_block(self):
        print("\n=== CW-03: Illegal Direct Publish Block (P0) ===")
        manager = UserFactory(is_email_verified=True, status="active")
        UserRole.objects.create(user=manager, role=self.role_map["content_manager"])
        self.client.cookies["access_token"] = str(RefreshToken.for_user(manager).access_token)
        
        exam = ExamFactory(is_active=True)
        question = PublishedQuestionFactory(exam=exam, review_status="draft")
        
        url = reverse("content_review:question-publish", kwargs={"question_pk": question.id})
        resp = self.client.post(url)
        
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        print("CW-03 RESULT: PASS")

    def test_cw_02_publish_without_approval_block(self):
        print("\n=== CW-02: Publish without Approval Block (P0) ===")
        manager = UserFactory(is_email_verified=True, status="active")
        UserRole.objects.create(user=manager, role=self.role_map["content_manager"])
        self.client.cookies["access_token"] = str(RefreshToken.for_user(manager).access_token)
        
        exam = ExamFactory(is_active=True)
        question = PublishedQuestionFactory(exam=exam, review_status="approved")
        
        url = reverse("content_review:question-publish", kwargs={"question_pk": question.id})
        resp = self.client.post(url)
        
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        print("CW-02 RESULT: PASS")

    def test_cw_04_ai_sme_policy(self):
        print("\n=== CW-04: AI SME Policy Enforce (P0) ===")
        reviewer = UserFactory(is_email_verified=True, status="active")
        manager = UserFactory(is_email_verified=True, status="active")
        UserRole.objects.create(user=reviewer, role=self.role_map["content_reviewer"])
        UserRole.objects.create(user=manager, role=self.role_map["content_manager"])
        
        exam = ExamFactory(is_active=True)
        question = PublishedQuestionFactory(exam=exam, origin="ai", review_status="sme_review")
        QuestionOptionFactory(question=question, is_correct=True)
        
        # Reviewer approves (this should be blocked now, returning 400 because they try to call standard approve on sme_review question!)
        self.client.cookies["access_token"] = str(RefreshToken.for_user(reviewer).access_token)
        url_approve = reverse("content_review:question-approve", kwargs={"question_pk": question.id})
        resp = self.client.post(url_approve)
        
        if resp.status_code == 200:
            print("[BUG #2 DETECTED] - AI-origin question was approved by reviewer due to bypass.")
            assert False, "Bug #2 SME Bypass allows reviewer to approve AI content!"
            
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        print("CW-04 RESULT: PASS")
