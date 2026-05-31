import pytest
from uuid import UUID

from django.urls import reverse

from questions.models import Question

pytestmark = pytest.mark.django_db


# ── Question List / Create ──────────────────────────────────────────────


class TestQuestionList:
    LIST_URL = "/api/v1/questions/"

    def test_returns_all_questions(self, content_manager_api_client, question):
        client = content_manager_api_client
        response = client.get(self.LIST_URL)
        assert response.status_code == 200
        assert len(response.data) >= 1

    def test_returns_empty_list(self, content_manager_api_client):
        client = content_manager_api_client
        response = client.get(self.LIST_URL)
        assert response.status_code == 200
        assert response.data == []

    def test_anonymous_returns_401(self, anonymous_client):
        response = anonymous_client.get(self.LIST_URL)
        assert response.status_code == 401

    def test_student_can_read(self, student_api_client, question):
        client = student_api_client
        response = client.get(self.LIST_URL)
        assert response.status_code == 200


class TestQuestionCreate:
    LIST_URL = "/api/v1/questions/"

    def test_creates_question(self, content_manager_api_client, exam, subtopic):
        client = content_manager_api_client
        data = {
            "exam_id": str(exam.id),
            "subtopic_id": str(subtopic.id),
            "stem": "What is Newton's second law?",
        }
        response = client.post(self.LIST_URL, data, format="json")
        assert response.status_code == 201
        assert response.data["stem"] == "What is Newton's second law?"
        assert UUID(response.data["id"])

    def test_content_manager_can_create(self, content_manager_api_client, exam, subtopic):
        client = content_manager_api_client
        data = {"exam_id": str(exam.id), "subtopic_id": str(subtopic.id), "stem": "Test?"}
        response = client.post(self.LIST_URL, data, format="json")
        assert response.status_code == 201

    def test_student_cannot_create(self, student_api_client, exam, subtopic):
        client = student_api_client
        data = {"exam_id": str(exam.id), "subtopic_id": str(subtopic.id), "stem": "Test?"}
        response = client.post(self.LIST_URL, data, format="json")
        assert response.status_code == 403

    def test_anonymous_cannot_create(self, anonymous_client, exam, subtopic):
        data = {"exam_id": str(exam.id), "subtopic_id": str(subtopic.id), "stem": "Test?"}
        response = anonymous_client.post(self.LIST_URL, data, format="json")
        assert response.status_code == 401

    def test_validation_error(self, content_manager_api_client):
        client = content_manager_api_client
        response = client.post(self.LIST_URL, {}, format="json")
        assert response.status_code == 400


# ── Question Detail ────────────────────────────────────────────────────


class TestQuestionDetail:
    def test_returns_question(self, content_manager_api_client, question):
        client = content_manager_api_client
        url = f"/api/v1/questions/{question.id}/"
        response = client.get(url)
        assert response.status_code == 200
        assert response.data["id"] == str(question.id)

    def test_returns_404(self, content_manager_api_client):
        client = content_manager_api_client
        url = "/api/v1/questions/00000000-0000-0000-0000-000000000000/"
        response = client.get(url)
        assert response.status_code == 404

    def test_updates_question(self, content_manager_api_client, question):
        client = content_manager_api_client
        url = f"/api/v1/questions/{question.id}/"
        response = client.patch(url, {"stem": "Updated stem"}, format="json")
        assert response.status_code == 200
        assert response.data["stem"] == "Updated stem"

    def test_deletes_question(self, content_manager_api_client, question):
        client = content_manager_api_client
        url = f"/api/v1/questions/{question.id}/"
        response = client.delete(url)
        assert response.status_code == 204
        assert not Question.objects.filter(id=question.id).exists()

    def test_student_cannot_delete(self, student_api_client, question):
        client = student_api_client
        url = f"/api/v1/questions/{question.id}/"
        response = client.delete(url)
        assert response.status_code == 403

    def test_nested_options_included(self, content_manager_api_client, question_with_options):
        client = content_manager_api_client
        q, _ = question_with_options
        q.refresh_from_db()
        url = f"/api/v1/questions/{q.id}/"
        response = client.get(url)
        assert response.status_code == 200
        assert len(response.data["options"]) == 4


# ── Question Options ───────────────────────────────────────────────────


class TestQuestionOptionList:
    def test_returns_options(self, content_manager_api_client, question_with_options):
        client = content_manager_api_client
        q, _ = question_with_options
        url = f"/api/v1/questions/{q.id}/options/"
        response = client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 4


class TestQuestionOptionCreate:
    CREATE_URL = "/api/v1/options/create/"

    def test_creates_option(self, content_manager_api_client, question):
        client = content_manager_api_client
        data = {
            "question_id": str(question.id),
            "label": "E",
            "body": "Option E body",
        }
        response = client.post(self.CREATE_URL, data, format="json")
        assert response.status_code == 201
        assert response.data["label"] == "E"

    def test_student_cannot_create(self, student_api_client, question):
        client = student_api_client
        data = {"question_id": str(question.id), "label": "E", "body": "Body"}
        response = client.post(self.CREATE_URL, data, format="json")
        assert response.status_code == 403


class TestQuestionOptionDetail:
    def test_returns_option(self, content_manager_api_client, question_with_options):
        client = content_manager_api_client
        _, options = question_with_options
        url = f"/api/v1/options/{options[0].id}/"
        response = client.get(url)
        assert response.status_code == 200
        assert response.data["label"] == options[0].label

    def test_updates_option(self, content_manager_api_client, question_with_options):
        client = content_manager_api_client
        _, options = question_with_options
        url = f"/api/v1/options/{options[0].id}/"
        response = client.patch(url, {"label": "X"}, format="json")
        assert response.status_code == 200
        assert response.data["label"] == "X"

    def test_deletes_option(self, content_manager_api_client, question_with_options):
        client = content_manager_api_client
        _, options = question_with_options
        url = f"/api/v1/options/{options[0].id}/"
        response = client.delete(url)
        assert response.status_code == 204

    def test_returns_404(self, content_manager_api_client):
        client = content_manager_api_client
        url = "/api/v1/options/00000000-0000-0000-0000-000000000000/"
        response = client.get(url)
        assert response.status_code == 404


# ── Question Appearances ──────────────────────────────────────────────


class TestQuestionAppearanceList:
    def test_returns_appearances(
        self, content_manager_api_client, question, question_appearance
    ):
        client = content_manager_api_client
        url = f"/api/v1/questions/{question.id}/appearances/"
        response = client.get(url)
        assert response.status_code == 200
        assert len(response.data) >= 1
        assert response.data[0]["year"] == 2024


class TestQuestionAppearanceCreate:
    CREATE_URL = "/api/v1/appearances/create/"

    def test_creates_appearance(
        self, content_manager_api_client, question, previous_year_paper
    ):
        client = content_manager_api_client
        data = {
            "question_id": str(question.id),
            "paper_id": str(previous_year_paper.id),
            "year": 2024,
        }
        response = client.post(self.CREATE_URL, data, format="json")
        assert response.status_code == 201
        assert response.data["year"] == 2024

    def test_student_cannot_create(
        self, student_api_client, question, previous_year_paper
    ):
        client = student_api_client
        data = {
            "question_id": str(question.id),
            "paper_id": str(previous_year_paper.id),
            "year": 2024,
        }
        response = client.post(self.CREATE_URL, data, format="json")
        assert response.status_code == 403


class TestQuestionAppearanceDelete:
    def test_deletes_appearance(
        self, content_manager_api_client, question_appearance
    ):
        client = content_manager_api_client
        url = f"/api/v1/appearances/{question_appearance.id}/"
        response = client.delete(url)
        assert response.status_code == 204

    def test_student_cannot_delete(
        self, student_api_client, question_appearance
    ):
        client = student_api_client
        url = f"/api/v1/appearances/{question_appearance.id}/"
        response = client.delete(url)
        assert response.status_code == 403

    def test_returns_404(self, content_manager_api_client):
        client = content_manager_api_client
        url = "/api/v1/appearances/00000000-0000-0000-0000-000000000000/"
        response = client.delete(url)
        assert response.status_code == 404


# ── Question Stats ─────────────────────────────────────────────────────


class TestQuestionStatsDetail:
    def test_returns_stats(self, content_manager_api_client, question, question_stat):
        client = content_manager_api_client
        url = f"/api/v1/questions/{question.id}/stats/"
        response = client.get(url)
        assert response.status_code == 200
        assert response.data["question_id"] == str(question.id)
        assert response.data["attempts"] == 0

    def test_returns_404(self, content_manager_api_client, question):
        client = content_manager_api_client
        url = f"/api/v1/questions/{question.id}/stats/"
        response = client.get(url)
        assert response.status_code == 404


# ── AI Generated Questions ────────────────────────────────────────────


class TestAiGeneratedList:
    LIST_URL = "/api/v1/ai-generations/"

    def test_requires_exam_id(self, content_manager_api_client):
        client = content_manager_api_client
        response = client.get(self.LIST_URL)
        assert response.status_code == 400

    def test_returns_generations(
        self, content_manager_api_client, exam, ai_generated_question
    ):
        client = content_manager_api_client
        url = f"{self.LIST_URL}?exam_id={exam.id}"
        response = client.get(url)
        assert response.status_code == 200
        assert len(response.data) >= 1

    def test_student_cannot_read(self, student_api_client, exam):
        client = student_api_client
        url = f"{self.LIST_URL}?exam_id={exam.id}"
        response = client.get(url)
        assert response.status_code == 403

    def test_content_reviewer_cannot_read(self, content_reviewer_api_client, exam):
        client = content_reviewer_api_client
        url = f"{self.LIST_URL}?exam_id={exam.id}"
        response = client.get(url)
        assert response.status_code == 403


class TestAiGeneratedCreate:
    LIST_URL = "/api/v1/ai-generations/"

    def test_creates_generation(self, content_manager_api_client, exam):
        client = content_manager_api_client
        data = {
            "exam_id": str(exam.id),
            "model_used": "groq/llama-3.3-70b-versatile",
        }
        response = client.post(self.LIST_URL, data, format="json")
        assert response.status_code == 201
        assert response.data["model_used"] == "groq/llama-3.3-70b-versatile"

    def test_student_cannot_create(self, student_api_client, exam):
        client = student_api_client
        data = {"exam_id": str(exam.id), "model_used": "test"}
        response = client.post(self.LIST_URL, data, format="json")
        assert response.status_code == 403


class TestAiGeneratedDetail:
    def test_returns_generation(
        self, content_manager_api_client, ai_generated_question
    ):
        client = content_manager_api_client
        url = f"/api/v1/ai-generations/{ai_generated_question.id}/"
        response = client.get(url)
        assert response.status_code == 200
        assert response.data["id"] == str(ai_generated_question.id)

    def test_updates_generation(
        self, content_manager_api_client, ai_generated_question
    ):
        client = content_manager_api_client
        url = f"/api/v1/ai-generations/{ai_generated_question.id}/"
        response = client.patch(
            url, {"status": "validated"}, format="json"
        )
        assert response.status_code == 200
        assert response.data["status"] == "validated"

    def test_deletes_generation(
        self, content_manager_api_client, ai_generated_question
    ):
        client = content_manager_api_client
        url = f"/api/v1/ai-generations/{ai_generated_question.id}/"
        response = client.delete(url)
        assert response.status_code == 204

    def test_returns_404(self, content_manager_api_client):
        client = content_manager_api_client
        url = "/api/v1/ai-generations/00000000-0000-0000-0000-000000000000/"
        response = client.get(url)
        assert response.status_code == 404

    def test_student_cannot_read(
        self, student_api_client, ai_generated_question
    ):
        client = student_api_client
        url = f"/api/v1/ai-generations/{ai_generated_question.id}/"
        response = client.get(url)
        assert response.status_code == 403


class TestAiGeneratedPromote:
    def test_promotes_to_question(
        self, content_manager_api_client, ai_generated_question, subtopic
    ):
        client = content_manager_api_client
        ai_generated_question.status = "validated"
        ai_generated_question.save()
        url = f"/api/v1/ai-generations/{ai_generated_question.id}/promote/"
        data = {
            "stem": "What is Newton's third law?",
            "subtopic_id": str(subtopic.id),
        }
        response = client.post(url, data, format="json")
        assert response.status_code == 201
        assert response.data["stem"] == "What is Newton's third law?"
        assert response.data["origin"] == "ai"

    def test_requires_validated_status(
        self, content_manager_api_client, ai_generated_question, subtopic
    ):
        client = content_manager_api_client
        url = f"/api/v1/ai-generations/{ai_generated_question.id}/promote/"
        data = {
            "stem": "A question?",
            "subtopic_id": str(subtopic.id),
        }
        response = client.post(url, data, format="json")
        assert response.status_code == 400

    def test_student_cannot_promote(
        self, student_api_client, ai_generated_question, subtopic
    ):
        client = student_api_client
        url = f"/api/v1/ai-generations/{ai_generated_question.id}/promote/"
        response = client.post(url, {}, format="json")
        assert response.status_code == 403


# ── Learner: Published Questions ──────────────────────────────────────


class TestPublishedQuestionList:
    LIST_URL = "/api/v1/questions/published/"

    def test_returns_published(self, student_api_client, published_question):
        client = student_api_client
        response = client.get(self.LIST_URL)
        assert response.status_code == 200
        assert len(response.data) >= 1
        assert response.data[0]["review_status"] == "published"

    def test_excludes_draft(self, student_api_client, draft_question):
        client = student_api_client
        response = client.get(self.LIST_URL)
        assert response.status_code == 200
        for q in response.data:
            assert q["review_status"] != "draft"

    def test_anonymous_returns_401(self, anonymous_client):
        response = anonymous_client.get(self.LIST_URL)
        assert response.status_code == 401

    def test_content_manager_cannot_read(self, content_manager_api_client):
        client = content_manager_api_client
        response = client.get(self.LIST_URL)
        assert response.status_code == 403


class TestPublishedQuestionDetail:
    def test_returns_published(self, student_api_client, published_question):
        client = student_api_client
        url = f"/api/v1/questions/published/{published_question.id}/"
        response = client.get(url)
        assert response.status_code == 200
        assert response.data["id"] == str(published_question.id)

    def test_returns_404_for_draft(self, student_api_client, draft_question):
        client = student_api_client
        url = f"/api/v1/questions/published/{draft_question.id}/"
        response = client.get(url)
        assert response.status_code == 404


class TestPublishedQuestionBySubtopic:
    def test_returns_by_subtopic(
        self, student_api_client, published_question, subtopic
    ):
        client = student_api_client
        url = f"/api/v1/questions/published/by-subtopic/{subtopic.id}/"
        response = client.get(url)
        assert response.status_code == 200
        assert len(response.data) >= 1



