import pytest

pytestmark = pytest.mark.django_db


# ═══════════════════════════════════════════════════════════════════════════════
# EXAMS
# ═══════════════════════════════════════════════════════════════════════════════


class TestExamList:
    def test_returns_all_exams(self, platform_admin_api_client, exam, inactive_exam):
        response = platform_admin_api_client.get("/api/v1/exams/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2

    def test_returns_exam_data_shape(self, platform_admin_api_client, exam):
        response = platform_admin_api_client.get("/api/v1/exams/")
        assert response.status_code == 200
        item = response.json()[0]
        assert "id" in item
        assert "code" in item
        assert "name" in item
        assert "exam_type" in item
        assert "is_active" in item

    def test_post_creates_exam(self, platform_admin_api_client):
        payload = {
            "code": "NEW_EXAM",
            "name": "New Exam",
            "exam_type": "qualifying",
        }
        response = platform_admin_api_client.post(
            "/api/v1/exams/", payload, format="json"
        )
        assert response.status_code == 201
        data = response.json()
        assert data["code"] == "NEW_EXAM"
        assert data["name"] == "New Exam"
        assert data["is_active"] is True

    def test_post_duplicate_code_returns_400(
        self, platform_admin_api_client, exam
    ):
        payload = {
            "code": exam.code,
            "name": "Duplicate",
            "exam_type": "qualifying",
        }
        response = platform_admin_api_client.post(
            "/api/v1/exams/", payload, format="json"
        )
        assert response.status_code == 400
        assert "already exists" in str(response.data).lower()

    def test_post_invalid_data_returns_400(self, platform_admin_api_client):
        response = platform_admin_api_client.post(
            "/api/v1/exams/", {"code": ""}, format="json"
        )
        assert response.status_code == 400


class TestExamDetail:
    def test_get_returns_exam(self, platform_admin_api_client, exam):
        response = platform_admin_api_client.get(f"/api/v1/exams/{exam.id}/")
        assert response.status_code == 200
        assert response.json()["id"] == str(exam.id)

    def test_get_missing_returns_404(self, platform_admin_api_client):
        response = platform_admin_api_client.get(
            "/api/v1/exams/00000000-0000-0000-0000-000000000000/"
        )
        assert response.status_code == 404

    def test_patch_updates_exam(self, platform_admin_api_client, exam):
        response = platform_admin_api_client.patch(
            f"/api/v1/exams/{exam.id}/",
            {"name": "Updated"},
            format="json",
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Updated"

    def test_patch_missing_returns_404(self, platform_admin_api_client):
        response = platform_admin_api_client.patch(
            "/api/v1/exams/00000000-0000-0000-0000-000000000000/",
            {"name": "Nope"},
            format="json",
        )
        assert response.status_code == 404


class TestExamTree:
    def test_returns_hierarchy(self, platform_admin_api_client, exam_hierarchy):
        exam = exam_hierarchy["exam"]
        response = platform_admin_api_client.get(
            f"/api/v1/exams/{exam.id}/tree/"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "CTET_P2_SCI"
        assert len(data["subjects"]) == 1
        assert data["subjects"][0]["name"] == "Science"
        assert len(data["subjects"][0]["topics"]) == 1
        assert data["subjects"][0]["topics"][0]["subtopics"][0]["name"] == "Motion"

    def test_missing_returns_404(self, platform_admin_api_client):
        response = platform_admin_api_client.get(
            "/api/v1/exams/00000000-0000-0000-0000-000000000000/tree/"
        )
        assert response.status_code == 404

    def test_query_count(
        self, platform_admin_api_client, exam_hierarchy, django_assert_num_queries
    ):
        exam = exam_hierarchy["exam"]
        with django_assert_num_queries(8):
            platform_admin_api_client.get(f"/api/v1/exams/{exam.id}/tree/")


class TestExamActivate:
    def test_activates_inactive_exam(
        self, platform_admin_api_client, inactive_exam
    ):
        response = platform_admin_api_client.post(
            f"/api/v1/exams/{inactive_exam.id}/activate/"
        )
        assert response.status_code == 200
        assert response.json()["is_active"] is True

    def test_missing_returns_404(self, platform_admin_api_client):
        response = platform_admin_api_client.post(
            "/api/v1/exams/00000000-0000-0000-0000-000000000000/activate/"
        )
        assert response.status_code == 404

    def test_idempotent(self, platform_admin_api_client, exam):
        response = platform_admin_api_client.post(
            f"/api/v1/exams/{exam.id}/activate/"
        )
        assert response.status_code == 200


class TestExamDeactivate:
    def test_deactivates_active_exam(self, platform_admin_api_client, exam):
        response = platform_admin_api_client.post(
            f"/api/v1/exams/{exam.id}/deactivate/"
        )
        assert response.status_code == 200
        assert response.json()["is_active"] is False

    def test_missing_returns_404(self, platform_admin_api_client):
        response = platform_admin_api_client.post(
            "/api/v1/exams/00000000-0000-0000-0000-000000000000/deactivate/"
        )
        assert response.status_code == 404

    def test_idempotent(self, platform_admin_api_client, inactive_exam):
        response = platform_admin_api_client.post(
            f"/api/v1/exams/{inactive_exam.id}/deactivate/"
        )
        assert response.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════════
# SUBJECTS
# ═══════════════════════════════════════════════════════════════════════════════


class TestExamSubjectList:
    def test_returns_subjects_for_exam(
        self, platform_admin_api_client, exam, subject
    ):
        response = platform_admin_api_client.get(
            f"/api/v1/exams/{exam.id}/subjects/"
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert data[0]["name"] == "Science"

    def test_empty_exam_returns_empty_list(
        self, platform_admin_api_client, exam
    ):
        response = platform_admin_api_client.get(
            f"/api/v1/exams/{exam.id}/subjects/"
        )
        assert response.status_code == 200
        assert response.json() == []


class TestSubjectCreate:
    def test_creates_subject(self, platform_admin_api_client, exam):
        response = platform_admin_api_client.post(
            "/api/v1/subjects/",
            {"exam_id": str(exam.id), "name": "Maths"},
            format="json",
        )
        assert response.status_code == 201
        assert response.json()["name"] == "Maths"
        assert response.json()["exam_id"] == str(exam.id)

    def test_duplicate_name_returns_400(
        self, platform_admin_api_client, exam, subject
    ):
        response = platform_admin_api_client.post(
            "/api/v1/subjects/",
            {"exam_id": str(exam.id), "name": subject.name},
            format="json",
        )
        assert response.status_code == 400
        assert "already exists" in str(response.data).lower()

    def test_missing_exam_returns_404(self, platform_admin_api_client):
        response = platform_admin_api_client.post(
            "/api/v1/subjects/",
            {
                "exam_id": "00000000-0000-0000-0000-000000000000",
                "name": "Ghost",
            },
            format="json",
        )
        assert response.status_code == 404


class TestSubjectDetail:
    def test_get_returns_subject(
        self, platform_admin_api_client, subject
    ):
        response = platform_admin_api_client.get(
            f"/api/v1/subjects/{subject.id}/"
        )
        assert response.status_code == 200
        assert response.json()["id"] == str(subject.id)

    def test_get_missing_returns_404(self, platform_admin_api_client):
        response = platform_admin_api_client.get(
            "/api/v1/subjects/00000000-0000-0000-0000-000000000000/"
        )
        assert response.status_code == 404

    def test_patch_updates_subject(
        self, platform_admin_api_client, subject
    ):
        response = platform_admin_api_client.patch(
            f"/api/v1/subjects/{subject.id}/",
            {"name": "Updated Subject"},
            format="json",
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Subject"

    def test_patch_missing_returns_404(self, platform_admin_api_client):
        response = platform_admin_api_client.patch(
            "/api/v1/subjects/00000000-0000-0000-0000-000000000000/",
            {"name": "Nope"},
            format="json",
        )
        assert response.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# TOPICS
# ═══════════════════════════════════════════════════════════════════════════════


class TestSubjectTopicList:
    def test_returns_topics_for_subject(
        self, platform_admin_api_client, subject, topic
    ):
        response = platform_admin_api_client.get(
            f"/api/v1/subjects/{subject.id}/topics/"
        )
        assert response.status_code == 200
        assert len(response.json()) >= 1
        assert response.json()[0]["name"] == "Physics"

    def test_empty_subject_returns_empty_list(
        self, platform_admin_api_client, subject
    ):
        response = platform_admin_api_client.get(
            f"/api/v1/subjects/{subject.id}/topics/"
        )
        assert response.status_code == 200
        assert response.json() == []


class TestTopicCreate:
    def test_creates_topic(self, platform_admin_api_client, subject):
        response = platform_admin_api_client.post(
            "/api/v1/topics/",
            {"subject_id": str(subject.id), "name": "Chemistry"},
            format="json",
        )
        assert response.status_code == 201
        assert response.json()["name"] == "Chemistry"

    def test_duplicate_name_returns_400(
        self, platform_admin_api_client, subject, topic
    ):
        response = platform_admin_api_client.post(
            "/api/v1/topics/",
            {"subject_id": str(subject.id), "name": topic.name},
            format="json",
        )
        assert response.status_code == 400

    def test_missing_subject_returns_404(self, platform_admin_api_client):
        response = platform_admin_api_client.post(
            "/api/v1/topics/",
            {
                "subject_id": "00000000-0000-0000-0000-000000000000",
                "name": "Ghost",
            },
            format="json",
        )
        assert response.status_code == 404


class TestTopicDetail:
    def test_get_returns_topic(self, platform_admin_api_client, topic):
        response = platform_admin_api_client.get(
            f"/api/v1/topics/{topic.id}/"
        )
        assert response.status_code == 200
        assert response.json()["id"] == str(topic.id)

    def test_get_missing_returns_404(self, platform_admin_api_client):
        response = platform_admin_api_client.get(
            "/api/v1/topics/00000000-0000-0000-0000-000000000000/"
        )
        assert response.status_code == 404

    def test_patch_updates_topic(self, platform_admin_api_client, topic):
        response = platform_admin_api_client.patch(
            f"/api/v1/topics/{topic.id}/",
            {"name": "Updated Topic"},
            format="json",
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Topic"

    def test_patch_missing_returns_404(self, platform_admin_api_client):
        response = platform_admin_api_client.patch(
            "/api/v1/topics/00000000-0000-0000-0000-000000000000/",
            {"name": "Nope"},
            format="json",
        )
        assert response.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# SUBTOPICS
# ═══════════════════════════════════════════════════════════════════════════════


class TestTopicSubtopicList:
    def test_returns_subtopics_for_topic(
        self, platform_admin_api_client, topic, subtopic
    ):
        response = platform_admin_api_client.get(
            f"/api/v1/topics/{topic.id}/subtopics/"
        )
        assert response.status_code == 200
        assert len(response.json()) >= 1
        assert response.json()[0]["name"] == "Motion"

    def test_empty_topic_returns_empty_list(
        self, platform_admin_api_client, topic
    ):
        response = platform_admin_api_client.get(
            f"/api/v1/topics/{topic.id}/subtopics/"
        )
        assert response.status_code == 200
        assert response.json() == []


class TestSubtopicCreate:
    def test_creates_subtopic(self, platform_admin_api_client, topic):
        response = platform_admin_api_client.post(
            "/api/v1/subtopics/",
            {"topic_id": str(topic.id), "name": "Energy"},
            format="json",
        )
        assert response.status_code == 201
        assert response.json()["name"] == "Energy"

    def test_duplicate_name_returns_400(
        self, platform_admin_api_client, topic, subtopic
    ):
        response = platform_admin_api_client.post(
            "/api/v1/subtopics/",
            {"topic_id": str(topic.id), "name": subtopic.name},
            format="json",
        )
        assert response.status_code == 400

    def test_missing_topic_returns_404(self, platform_admin_api_client):
        response = platform_admin_api_client.post(
            "/api/v1/subtopics/",
            {
                "topic_id": "00000000-0000-0000-0000-000000000000",
                "name": "Ghost",
            },
            format="json",
        )
        assert response.status_code == 404


class TestSubtopicDetail:
    def test_get_returns_subtopic(
        self, platform_admin_api_client, subtopic
    ):
        response = platform_admin_api_client.get(
            f"/api/v1/subtopics/{subtopic.id}/"
        )
        assert response.status_code == 200
        assert response.json()["id"] == str(subtopic.id)

    def test_get_missing_returns_404(self, platform_admin_api_client):
        response = platform_admin_api_client.get(
            "/api/v1/subtopics/00000000-0000-0000-0000-000000000000/"
        )
        assert response.status_code == 404

    def test_patch_updates_subtopic(
        self, platform_admin_api_client, subtopic
    ):
        response = platform_admin_api_client.patch(
            f"/api/v1/subtopics/{subtopic.id}/",
            {"name": "Updated Subtopic"},
            format="json",
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Subtopic"

    def test_patch_missing_returns_404(self, platform_admin_api_client):
        response = platform_admin_api_client.patch(
            "/api/v1/subtopics/00000000-0000-0000-0000-000000000000/",
            {"name": "Nope"},
            format="json",
        )
        assert response.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# SYLLABUS
# ═══════════════════════════════════════════════════════════════════════════════


class TestExamSyllabusList:
    def test_returns_syllabus_for_exam(
        self, platform_admin_api_client, exam, syllabus_item
    ):
        response = platform_admin_api_client.get(
            f"/api/v1/exams/{exam.id}/syllabus/"
        )
        assert response.status_code == 200
        assert len(response.json()) >= 1
        assert response.json()[0]["title"] == syllabus_item.title

    def test_empty_exam_returns_empty_list(
        self, platform_admin_api_client, exam
    ):
        response = platform_admin_api_client.get(
            f"/api/v1/exams/{exam.id}/syllabus/"
        )
        assert response.status_code == 200
        assert response.json() == []


class TestSyllabusCreate:
    def test_creates_syllabus_item(
        self, platform_admin_api_client, exam
    ):
        response = platform_admin_api_client.post(
            "/api/v1/syllabus/",
            {
                "exam_id": str(exam.id),
                "title": "Newton's Laws",
            },
            format="json",
        )
        assert response.status_code == 201
        assert response.json()["title"] == "Newton's Laws"

    def test_missing_exam_returns_404(self, platform_admin_api_client):
        response = platform_admin_api_client.post(
            "/api/v1/syllabus/",
            {
                "exam_id": "00000000-0000-0000-0000-000000000000",
                "title": "Ghost",
            },
            format="json",
        )
        assert response.status_code == 404

    def test_invalid_data_returns_400(self, platform_admin_api_client):
        response = platform_admin_api_client.post(
            "/api/v1/syllabus/", {}, format="json"
        )
        assert response.status_code == 400


class TestSyllabusDetail:
    def test_get_returns_syllabus_item(
        self, platform_admin_api_client, syllabus_item
    ):
        response = platform_admin_api_client.get(
            f"/api/v1/syllabus/{syllabus_item.id}/"
        )
        assert response.status_code == 200
        assert response.json()["id"] == str(syllabus_item.id)

    def test_get_missing_returns_404(self, platform_admin_api_client):
        response = platform_admin_api_client.get(
            "/api/v1/syllabus/00000000-0000-0000-0000-000000000000/"
        )
        assert response.status_code == 404

    def test_patch_updates_syllabus_item(
        self, platform_admin_api_client, syllabus_item
    ):
        response = platform_admin_api_client.patch(
            f"/api/v1/syllabus/{syllabus_item.id}/",
            {"title": "Updated Title"},
            format="json",
        )
        assert response.status_code == 200
        assert response.json()["title"] == "Updated Title"

    def test_patch_missing_returns_404(self, platform_admin_api_client):
        response = platform_admin_api_client.patch(
            "/api/v1/syllabus/00000000-0000-0000-0000-000000000000/",
            {"title": "Nope"},
            format="json",
        )
        assert response.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# PREVIOUS YEAR PAPERS
# ═══════════════════════════════════════════════════════════════════════════════


class TestPaperList:
    def test_returns_all_papers(
        self, platform_admin_api_client, previous_year_paper
    ):
        response = platform_admin_api_client.get("/api/v1/papers/")
        assert response.status_code == 200
        assert len(response.json()) >= 1

    def test_filter_by_exam(
        self, platform_admin_api_client, exam, previous_year_paper
    ):
        response = platform_admin_api_client.get(
            f"/api/v1/papers/?exam_id={exam.id}"
        )
        assert response.status_code == 200
        assert len(response.json()) >= 1

    def test_post_creates_paper(self, platform_admin_api_client, exam):
        payload = {
            "exam_id": str(exam.id),
            "code": "PAPER_2025",
            "year": 2025,
        }
        response = platform_admin_api_client.post(
            "/api/v1/papers/", payload, format="json"
        )
        assert response.status_code == 201
        assert response.json()["code"] == "PAPER_2025"

    def test_post_duplicate_returns_400(
        self, platform_admin_api_client, previous_year_paper
    ):
        payload = {
            "exam_id": str(previous_year_paper.exam_id),
            "code": previous_year_paper.code,
            "year": previous_year_paper.year,
        }
        response = platform_admin_api_client.post(
            "/api/v1/papers/", payload, format="json"
        )
        assert response.status_code == 400

    def test_post_invalid_data_returns_400(
        self, platform_admin_api_client
    ):
        response = platform_admin_api_client.post(
            "/api/v1/papers/", {}, format="json"
        )
        assert response.status_code == 400


class TestPaperDetail:
    def test_get_returns_paper(
        self, platform_admin_api_client, previous_year_paper
    ):
        response = platform_admin_api_client.get(
            f"/api/v1/papers/{previous_year_paper.id}/"
        )
        assert response.status_code == 200
        assert response.json()["id"] == str(previous_year_paper.id)

    def test_get_missing_returns_404(self, platform_admin_api_client):
        response = platform_admin_api_client.get(
            "/api/v1/papers/00000000-0000-0000-0000-000000000000/"
        )
        assert response.status_code == 404

    def test_patch_updates_paper(
        self, platform_admin_api_client, previous_year_paper
    ):
        response = platform_admin_api_client.patch(
            f"/api/v1/papers/{previous_year_paper.id}/",
            {"total_questions": 200},
            format="json",
        )
        assert response.status_code == 200
        assert response.json()["total_questions"] == 200

    def test_patch_missing_returns_404(self, platform_admin_api_client):
        response = platform_admin_api_client.patch(
            "/api/v1/papers/00000000-0000-0000-0000-000000000000/",
            {"code": "Nope"},
            format="json",
        )
        assert response.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# DOMAIN EXCEPTION TRANSLATION
# ═══════════════════════════════════════════════════════════════════════════════


class TestDomainExceptionTranslation:
    def test_exam_not_found_returns_404(self, platform_admin_api_client):
        response = platform_admin_api_client.get(
            "/api/v1/exams/00000000-0000-0000-0000-000000000000/"
        )
        assert response.status_code == 404

    def test_duplicate_code_returns_400(
        self, platform_admin_api_client, exam
    ):
        payload = {
            "code": exam.code,
            "name": "Duplicate",
            "exam_type": "qualifying",
        }
        response = platform_admin_api_client.post(
            "/api/v1/exams/", payload, format="json"
        )
        assert response.status_code == 400

    def test_duplicate_subject_name_returns_400(
        self, platform_admin_api_client, subject
    ):
        response = platform_admin_api_client.post(
            "/api/v1/subjects/",
            {"exam_id": str(subject.exam_id), "name": subject.name},
            format="json",
        )
        assert response.status_code == 400

    def test_duplicate_topic_name_returns_400(
        self, platform_admin_api_client, topic
    ):
        response = platform_admin_api_client.post(
            "/api/v1/topics/",
            {"subject_id": str(topic.subject_id), "name": topic.name},
            format="json",
        )
        assert response.status_code == 400

    def test_duplicate_subtopic_name_returns_400(
        self, platform_admin_api_client, subtopic
    ):
        response = platform_admin_api_client.post(
            "/api/v1/subtopics/",
            {"topic_id": str(subtopic.topic_id), "name": subtopic.name},
            format="json",
        )
        assert response.status_code == 400

    def test_duplicate_paper_returns_400(
        self, platform_admin_api_client, previous_year_paper
    ):
        payload = {
            "exam_id": str(previous_year_paper.exam_id),
            "code": previous_year_paper.code,
            "year": previous_year_paper.year,
        }
        response = platform_admin_api_client.post(
            "/api/v1/papers/", payload, format="json"
        )
        assert response.status_code == 400
