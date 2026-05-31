import pytest
from decimal import Decimal
from django.urls import reverse
from rest_framework import status
from django.core.cache import cache

from attempts.models import ExamAttempt, UserAnswer
from attempts.services.attempt_services import score_attempt
from attempts.tests.factories import (
    ExamFactory,
    SubjectFactory,
    TopicFactory,
    SubtopicFactory,
    PublishedQuestionFactory,
    QuestionOptionFactory,
    ExamAttemptFactory,
    UserAnswerFactory,
)
from analytics.models import WeakTopic, UserTopicPerformance
from analytics.tasks import update_analytics_rollups


@pytest.mark.django_db
class TestE2EWorkflowValidation:
    """End-to-End Workflow Validation Test.
    
    Verifies the complete flow:
    Student Login / Auth -> Start Mock Test -> Answer Questions -> Submit Attempt -> 
    Score Attempt -> Results API -> Analytics API -> Dashboard API -> Weak Topics -> Recommendations
    """

    @pytest.fixture(autouse=True)
    def clear_cache(self):
        cache.clear()

    def test_e2e_student_workflow(self, student_api_client):
        # 1. Setup/Login is simulated by using the student_api_client fixture
        user = student_api_client.user
        
        # Define Exam hierarchy
        exam = ExamFactory(passing_criteria={"general": {"required_percentage": 50}})
        subject = SubjectFactory(exam=exam, name="Mathematics")
        topic = TopicFactory(subject=subject, name="Algebra")
        subtopic = SubtopicFactory(topic=topic, name="Quadratic Equations")
        
        # Create questions for mock test
        q1 = PublishedQuestionFactory(exam=exam, subtopic=subtopic)
        q2 = PublishedQuestionFactory(exam=exam, subtopic=subtopic)
        
        # Correct and Incorrect options
        q1_correct_opt = QuestionOptionFactory(question=q1, is_correct=True)
        q2_incorrect_opt = QuestionOptionFactory(question=q2, is_correct=False)
        
        # Create mock attempt
        attempt = ExamAttemptFactory(exam=exam, user=user, total_questions=2)
        
        # 2. Start Mock Test
        start_url = reverse("attempts:attempt-start", kwargs={"pk": attempt.id})
        start_resp = student_api_client.post(start_url)
        assert start_resp.status_code == status.HTTP_200_OK
        assert start_resp.data["status"] == "in_progress"

        # 3. Answer Questions
        answer_url = reverse("attempts:answer-save", kwargs={"attempt_pk": attempt.id})
        
        # Save correct answer for Q1
        ans1_resp = student_api_client.post(answer_url, {
            "question_id": str(q1.id),
            "selected_option_id": str(q1_correct_opt.id),
            "state": "answered",
            "time_spent_seconds": 30,
        }, format="json")
        assert ans1_resp.status_code == status.HTTP_200_OK

        # Save incorrect answer for Q2
        ans2_resp = student_api_client.post(answer_url, {
            "question_id": str(q2.id),
            "selected_option_id": str(q2_incorrect_opt.id),
            "state": "answered",
            "time_spent_seconds": 40,
        }, format="json")
        assert ans2_resp.status_code == status.HTTP_200_OK

        # 4. Submit Attempt
        submit_url = reverse("attempts:attempt-submit", kwargs={"pk": attempt.id})
        submit_resp = student_api_client.post(submit_url)
        assert submit_resp.status_code == status.HTTP_200_OK
        assert submit_resp.data["status"] == "submitted"

        # 5. Score Attempt (calculates section analytics & enqueues rollups)
        # Note: score_attempt would enqueue task, let's run it and also execute the rollup logic synchronously
        scored_attempt = score_attempt(attempt_id=attempt.id)
        assert scored_attempt.status == "scored"
        assert scored_attempt.correct == 1
        assert scored_attempt.incorrect == 1
        assert scored_attempt.accuracy == Decimal("50.00")

        # Run rollup tasks synchronously to populate TopicPerformance & WeakTopics
        update_analytics_rollups(attempt_id=str(scored_attempt.id))

        # Confirm data got rolled up
        assert UserTopicPerformance.objects.filter(user=user, topic=topic).exists()
        # Topic accuracy is 50%, so it becomes a weak topic (since threshold is typically higher, e.g. 60% or 75%)
        # Let's verify WeakTopic creation
        weak_topics_qs = WeakTopic.objects.filter(user=user, exam=exam)
        assert weak_topics_qs.exists()

        # 6. Results API
        results_url = reverse("attempts:attempt-results", kwargs={"pk": attempt.id})
        results_resp = student_api_client.get(results_url)
        assert results_resp.status_code == status.HTTP_200_OK
        assert results_resp.data["score"] == "1.00"
        assert results_resp.data["max_score"] == "2.00"
        assert results_resp.data["accuracy"] == "50.00"
        assert results_resp.data["pass_status"] == "pass"  # 50% matches passing_criteria of 50%

        # 7. Analytics API
        analytics_url = reverse("attempts:attempt-analytics", kwargs={"pk": attempt.id})
        analytics_resp = student_api_client.get(analytics_url)
        assert analytics_resp.status_code == status.HTTP_200_OK
        assert len(analytics_resp.data["subjects"]) == 1
        assert len(analytics_resp.data["topics"]) == 1

        # 8. Dashboard API (Weak Topics & Recommendations)
        dashboard_url = "/api/v1/dashboard/"
        dashboard_resp = student_api_client.get(dashboard_url, {"exam_id": str(exam.id)})
        assert dashboard_resp.status_code == status.HTTP_200_OK
        
        # Verify response shape
        data = dashboard_resp.data
        assert "streak" in data
        assert "daily_questions_attempted" in data
        assert "overall_accuracy" in data
        assert "recent_activity" in data
        assert "weak_topics" in data
        assert "recommendations" in data

        # Verify weak topics and recommendations content
        assert len(data["weak_topics"]) >= 1
        wt = data["weak_topics"][0]
        assert str(wt["topic_id"]) == str(topic.id)
        assert wt["topic_name"] == "Algebra"
        assert wt["status"] == "active"

        # Recommendations should suggest questions or topics
        assert len(data["recommendations"]) >= 1
        rec = data["recommendations"][0]
        assert "topic_id" in rec
        assert rec["topic_name"] == "Algebra"
