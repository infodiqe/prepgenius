import pytest

pytestmark = pytest.mark.django_db


# ═══════════════════════════════════════════════════════════════════════════════
# READ SERIALIZATION TESTS
# ═══════════════════════════════════════════════════════════════════════════════


class TestExamReadSerializer:
    def test_serializes_exam(self, exam):
        from exams.serializers import ExamReadSerializer

        serializer = ExamReadSerializer(exam)
        data = serializer.data
        assert data["id"] == str(exam.id)
        assert data["code"] == exam.code
        assert data["name"] == exam.name
        assert data["exam_type"] == exam.exam_type
        assert data["is_active"] is True
        assert "created_at" in data
        assert "updated_at" in data


class TestSubjectReadSerializer:
    def test_serializes_subject(self, exam):
        from exams.serializers import SubjectReadSerializer
        from exams.models import Subject

        subject = Subject.objects.create(exam=exam, name="Science")
        serializer = SubjectReadSerializer(subject)
        data = serializer.data
        assert data["id"] == str(subject.id)
        assert data["exam_id"] == str(exam.id)
        assert data["name"] == "Science"
        assert data["position"] == 0


class TestTopicReadSerializer:
    def test_serializes_topic(self, subject):
        from exams.serializers import TopicReadSerializer
        from exams.models import Topic

        topic = Topic.objects.create(subject=subject, name="Physics")
        serializer = TopicReadSerializer(topic)
        data = serializer.data
        assert data["id"] == str(topic.id)
        assert data["subject_id"] == str(subject.id)
        assert data["name"] == "Physics"


class TestSubtopicReadSerializer:
    def test_serializes_subtopic(self, topic):
        from exams.serializers import SubtopicReadSerializer
        from exams.models import Subtopic

        subtopic = Subtopic.objects.create(topic=topic, name="Motion")
        serializer = SubtopicReadSerializer(subtopic)
        data = serializer.data
        assert data["id"] == str(subtopic.id)
        assert data["topic_id"] == str(topic.id)
        assert data["name"] == "Motion"


class TestSyllabusItemReadSerializer:
    def test_serializes_syllabus_item(self, syllabus_item):
        from exams.serializers import SyllabusItemReadSerializer

        serializer = SyllabusItemReadSerializer(syllabus_item)
        data = serializer.data
        assert data["id"] == str(syllabus_item.id)
        assert data["exam_id"] == str(syllabus_item.exam_id)
        assert data["title"] == syllabus_item.title

    def test_includes_weightage(self, exam):
        from exams.serializers import SyllabusItemReadSerializer
        from exams.models import SyllabusItem

        item = SyllabusItem.objects.create(
            exam=exam, title="Weighted", weightage=15.50, position=1
        )
        serializer = SyllabusItemReadSerializer(item)
        assert serializer.data["weightage"] == "15.50"


class TestPreviousYearPaperReadSerializer:
    def test_serializes_paper(self, previous_year_paper):
        from exams.serializers import PreviousYearPaperReadSerializer

        serializer = PreviousYearPaperReadSerializer(previous_year_paper)
        data = serializer.data
        assert data["id"] == str(previous_year_paper.id)
        assert data["exam_id"] == str(previous_year_paper.exam_id)
        assert data["code"] == previous_year_paper.code
        assert data["year"] == previous_year_paper.year
        assert data["language"] == previous_year_paper.language
        assert "created_at" in data


# ═══════════════════════════════════════════════════════════════════════════════
# CREATE SERIALIZER TESTS
# ═══════════════════════════════════════════════════════════════════════════════


class TestExamCreateSerializer:
    def test_valid_data(self):
        from exams.serializers import ExamCreateSerializer

        serializer = ExamCreateSerializer(
            data={
                "code": "CTET_P2_SCI",
                "name": "CTET Paper II (Science)",
                "exam_type": "qualifying",
            }
        )
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["code"] == "CTET_P2_SCI"
        assert serializer.validated_data["exam_type"] == "qualifying"

    def test_required_fields(self):
        from exams.serializers import ExamCreateSerializer

        serializer = ExamCreateSerializer(data={})
        assert not serializer.is_valid()
        assert "code" in serializer.errors
        assert "name" in serializer.errors
        assert "exam_type" in serializer.errors

    def test_rejects_invalid_exam_type(self):
        from exams.serializers import ExamCreateSerializer

        serializer = ExamCreateSerializer(
            data={
                "code": "INVALID",
                "name": "Invalid",
                "exam_type": "invalid_type",
            }
        )
        assert not serializer.is_valid()
        assert "exam_type" in serializer.errors

    def test_optional_fields_default(self):
        from exams.serializers import ExamCreateSerializer

        serializer = ExamCreateSerializer(
            data={
                "code": "OPTIONAL",
                "name": "Optional Fields",
                "exam_type": "qualifying",
            }
        )
        assert serializer.is_valid(), serializer.errors

    def test_rejects_long_code(self):
        from exams.serializers import ExamCreateSerializer

        serializer = ExamCreateSerializer(
            data={
                "code": "A" * 41,
                "name": "Long Code",
                "exam_type": "qualifying",
            }
        )
        assert not serializer.is_valid()
        assert "code" in serializer.errors


class TestSubjectCreateSerializer:
    def test_valid_data(self, exam):
        from exams.serializers import SubjectCreateSerializer

        serializer = SubjectCreateSerializer(
            data={"exam_id": str(exam.id), "name": "Science"}
        )
        assert serializer.is_valid(), serializer.errors

    def test_required_fields(self):
        from exams.serializers import SubjectCreateSerializer

        serializer = SubjectCreateSerializer(data={})
        assert not serializer.is_valid()
        assert "exam_id" in serializer.errors
        assert "name" in serializer.errors


class TestTopicCreateSerializer:
    def test_valid_data(self, subject):
        from exams.serializers import TopicCreateSerializer

        serializer = TopicCreateSerializer(
            data={"subject_id": str(subject.id), "name": "Physics"}
        )
        assert serializer.is_valid(), serializer.errors

    def test_required_fields(self):
        from exams.serializers import TopicCreateSerializer

        serializer = TopicCreateSerializer(data={})
        assert not serializer.is_valid()
        assert "subject_id" in serializer.errors
        assert "name" in serializer.errors


class TestSubtopicCreateSerializer:
    def test_valid_data(self, topic):
        from exams.serializers import SubtopicCreateSerializer

        serializer = SubtopicCreateSerializer(
            data={"topic_id": str(topic.id), "name": "Motion"}
        )
        assert serializer.is_valid(), serializer.errors

    def test_required_fields(self):
        from exams.serializers import SubtopicCreateSerializer

        serializer = SubtopicCreateSerializer(data={})
        assert not serializer.is_valid()
        assert "topic_id" in serializer.errors
        assert "name" in serializer.errors


class TestSyllabusItemCreateSerializer:
    def test_valid_data(self, exam):
        from exams.serializers import SyllabusItemCreateSerializer

        serializer = SyllabusItemCreateSerializer(
            data={
                "exam_id": str(exam.id),
                "title": "Newton's Laws",
            }
        )
        assert serializer.is_valid(), serializer.errors

    def test_required_fields(self):
        from exams.serializers import SyllabusItemCreateSerializer

        serializer = SyllabusItemCreateSerializer(data={})
        assert not serializer.is_valid()
        assert "exam_id" in serializer.errors
        assert "title" in serializer.errors

    def test_accepts_optional_fields(self, exam):
        from exams.serializers import SyllabusItemCreateSerializer

        serializer = SyllabusItemCreateSerializer(
            data={
                "exam_id": str(exam.id),
                "title": "Test",
                "description": "Desc",
                "weightage": 15.00,
                "position": 2,
                "parent_id": None,
                "topic_id": None,
                "subtopic_id": None,
            }
        )
        assert serializer.is_valid(), serializer.errors


class TestPreviousYearPaperCreateSerializer:
    def test_valid_data(self, exam):
        from exams.serializers import PreviousYearPaperCreateSerializer

        serializer = PreviousYearPaperCreateSerializer(
            data={
                "exam_id": str(exam.id),
                "code": "PAPER_2024",
                "year": 2024,
            }
        )
        assert serializer.is_valid(), serializer.errors

    def test_required_fields(self):
        from exams.serializers import PreviousYearPaperCreateSerializer

        serializer = PreviousYearPaperCreateSerializer(data={})
        assert not serializer.is_valid()
        assert "exam_id" in serializer.errors
        assert "code" in serializer.errors
        assert "year" in serializer.errors


# ═══════════════════════════════════════════════════════════════════════════════
# UPDATE SERIALIZER TESTS
# ═══════════════════════════════════════════════════════════════════════════════


class TestExamUpdateSerializer:
    def test_empty_data_is_valid(self):
        from exams.serializers import ExamUpdateSerializer

        serializer = ExamUpdateSerializer(data={})
        assert serializer.is_valid(), serializer.errors

    def test_partial_update(self):
        from exams.serializers import ExamUpdateSerializer

        serializer = ExamUpdateSerializer(
            data={"name": "Updated Name"}
        )
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["name"] == "Updated Name"
        assert "code" not in serializer.validated_data


class TestSubjectUpdateSerializer:
    def test_empty_data_is_valid(self):
        from exams.serializers import SubjectUpdateSerializer

        serializer = SubjectUpdateSerializer(data={})
        assert serializer.is_valid()

    def test_updates_name(self):
        from exams.serializers import SubjectUpdateSerializer

        serializer = SubjectUpdateSerializer(
            data={"name": "New Name"}
        )
        assert serializer.is_valid()
        assert serializer.validated_data["name"] == "New Name"


class TestTopicUpdateSerializer:
    def test_empty_data_is_valid(self):
        from exams.serializers import TopicUpdateSerializer

        serializer = TopicUpdateSerializer(data={})
        assert serializer.is_valid()


class TestSubtopicUpdateSerializer:
    def test_empty_data_is_valid(self):
        from exams.serializers import SubtopicUpdateSerializer

        serializer = SubtopicUpdateSerializer(data={})
        assert serializer.is_valid()


class TestSyllabusItemUpdateSerializer:
    def test_empty_data_is_valid(self):
        from exams.serializers import SyllabusItemUpdateSerializer

        serializer = SyllabusItemUpdateSerializer(data={})
        assert serializer.is_valid()

    def test_partial_update(self):
        from exams.serializers import SyllabusItemUpdateSerializer

        serializer = SyllabusItemUpdateSerializer(
            data={"title": "New Title"}
        )
        assert serializer.is_valid()


class TestPreviousYearPaperUpdateSerializer:
    def test_empty_data_is_valid(self):
        from exams.serializers import PreviousYearPaperUpdateSerializer

        serializer = PreviousYearPaperUpdateSerializer(data={})
        assert serializer.is_valid()


# ═══════════════════════════════════════════════════════════════════════════════
# HIERARCHY SERIALIZER TESTS
# ═══════════════════════════════════════════════════════════════════════════════


class TestHierarchySerializers:
    def test_subtopic_nested(self, topic):
        from exams.serializers import SubtopicNestedSerializer
        from exams.models import Subtopic

        subtopic = Subtopic.objects.create(topic=topic, name="Motion")
        serializer = SubtopicNestedSerializer(subtopic)
        data = serializer.data
        assert data["id"] == str(subtopic.id)
        assert data["name"] == "Motion"
        assert "topic_id" not in data

    def test_topic_hierarchy(self, topic):
        from exams.serializers import TopicHierarchySerializer
        from exams.models import Subtopic

        Subtopic.objects.create(topic=topic, name="Motion", position=1)
        Subtopic.objects.create(topic=topic, name="Force", position=2)
        serializer = TopicHierarchySerializer(topic)
        data = serializer.data
        assert data["name"] == topic.name
        assert len(data["subtopics"]) == 2
        assert data["subtopics"][0]["name"] == "Motion"

    def test_subject_hierarchy(self, subject):
        from exams.serializers import SubjectHierarchySerializer
        from exams.models import Subtopic, Topic

        physics = Topic.objects.create(
            subject=subject, name="Physics", position=1
        )
        Subtopic.objects.create(
            topic=physics, name="Motion", position=1
        )
        chemistry = Topic.objects.create(
            subject=subject, name="Chemistry", position=2
        )
        Subtopic.objects.create(
            topic=chemistry, name="Bonding", position=1
        )
        serializer = SubjectHierarchySerializer(subject)
        data = serializer.data
        assert data["name"] == subject.name
        assert len(data["topics"]) == 2
        assert data["topics"][0]["name"] == "Physics"
        assert len(data["topics"][0]["subtopics"]) == 1

    def test_exam_hierarchy(self, exam_hierarchy):
        from exams.serializers import ExamHierarchySerializer

        exam = exam_hierarchy["exam"]
        serializer = ExamHierarchySerializer(exam)
        data = serializer.data
        assert data["code"] == "CTET_P2_SCI"
        assert len(data["subjects"]) == 1
        assert data["subjects"][0]["name"] == "Science"
        assert len(data["subjects"][0]["topics"]) == 1
        assert data["subjects"][0]["topics"][0]["name"] == "Physics"
        assert len(
            data["subjects"][0]["topics"][0]["subtopics"]
        ) == 1
        assert (
            data["subjects"][0]["topics"][0]["subtopics"][0]["name"]
            == "Motion"
        )

    def test_exam_hierarchy_with_prefetch(self, exam_hierarchy, django_assert_num_queries):
        from django.db.models import Prefetch

        from exams.models import Exam, Subject, Subtopic, Topic
        from exams.serializers import ExamHierarchySerializer

        exam_id = exam_hierarchy["exam"].id
        with django_assert_num_queries(4):
            exam = (
                Exam.objects.prefetch_related(
                    Prefetch(
                        "subjects",
                        queryset=Subject.objects.prefetch_related(
                            Prefetch(
                                "topics",
                                queryset=Topic.objects.prefetch_related(
                                    Prefetch(
                                        "subtopics",
                                        queryset=Subtopic.objects.order_by(
                                            "position"
                                        ),
                                    )
                                ).order_by("position"),
                            )
                        ).order_by("position"),
                    )
                )
                .get(id=exam_id)
            )
            serializer = ExamHierarchySerializer(exam)
            data = serializer.data
            assert len(data["subjects"]) == 1
            assert data["subjects"][0]["topics"][0]["subtopics"][0]["name"] == "Motion"
