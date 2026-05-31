import pytest
from django.db import transaction

from exams.exceptions import (
    ExamCodeNotUniqueError,
    ExamInvalidCodeError,
    ExamNotFoundError,
    InvalidLanguageCodeError,
    InvalidYearError,
    PaperNotUniqueError,
    PreviousYearPaperNotFoundError,
    SubjectNameNotUniqueError,
    SubjectNotFoundError,
    SubtopicNameNotUniqueError,
    SubtopicNotFoundError,
    SyllabusCycleError,
    SyllabusDepthExceededError,
    SyllabusItemNotFoundError,
    SyllabusParentExamMismatchError,
    SyllabusSubtopicHierarchyError,
    SyllabusTopicHierarchyError,
    TopicNameNotUniqueError,
    TopicNotFoundError,
)
from exams.models import Exam, PreviousYearPaper, Subject, Subtopic, SyllabusItem, Topic

pytestmark = pytest.mark.django_db


# ── Exam Services ─────────────────────────────────────────────────────────────


class TestCreateExam:
    def test_create_exam(self):
        from exams.services.exam_services import create_exam

        exam = create_exam(
            code="CTET_P2_SCI",
            name="CTET Paper II (Science)",
            exam_type="qualifying",
        )
        assert exam.code == "CTET_P2_SCI"
        assert exam.name == "CTET Paper II (Science)"
        assert exam.exam_type == "qualifying"
        assert exam.is_active is True
        assert exam.difficulty_levels == ["easy", "medium", "hard"]
        assert Exam.objects.count() == 1

    def test_duplicate_code_raises(self):
        from exams.services.exam_services import create_exam

        create_exam(code="DUPE", name="First", exam_type="qualifying")
        with pytest.raises(ExamCodeNotUniqueError):
            create_exam(code="DUPE", name="Second", exam_type="qualifying")

    def test_sets_custom_fields(self):
        from exams.services.exam_services import create_exam

        exam = create_exam(
            code="CUSTOM",
            name="Custom Exam",
            exam_type="ranked",
            difficulty_levels=["beginner", "advanced"],
            audience_is_minor=True,
            is_active=False,
        )
        assert exam.exam_type == "ranked"
        assert exam.difficulty_levels == ["beginner", "advanced"]
        assert exam.audience_is_minor is True
        assert exam.is_active is False

    def test_uses_atomic(self):
        from exams.services.exam_services import create_exam

        with pytest.raises(Exception):
            with transaction.atomic():
                create_exam(
                    code="ATOMIC", name="Atomic Test", exam_type="qualifying"
                )
                raise Exception("rollback")
        assert Exam.objects.filter(code="ATOMIC").count() == 0


class TestUpdateExam:
    def test_updates_name(self):
        from exams.services.exam_services import create_exam, update_exam

        exam = create_exam(code="UPDATE", name="Original", exam_type="qualifying")
        updated = update_exam(exam_id=exam.id, name="Updated Name")
        assert updated.name == "Updated Name"

    def test_updates_code_with_uniqueness_check(self):
        from exams.services.exam_services import create_exam, update_exam

        exam = create_exam(code="FIRST", name="First", exam_type="qualifying")
        create_exam(code="SECOND", name="Second", exam_type="qualifying")
        with pytest.raises(ExamCodeNotUniqueError):
            update_exam(exam_id=exam.id, code="SECOND")

    def test_updates_code_when_same(self):
        from exams.services.exam_services import create_exam, update_exam

        exam = create_exam(code="SAME", name="Original", exam_type="qualifying")
        updated = update_exam(exam_id=exam.id, code="SAME")
        assert updated.code == "SAME"

    def test_raises_when_not_found(self):
        from exams.services.exam_services import update_exam

        with pytest.raises(ExamNotFoundError):
            update_exam(
                exam_id="00000000-0000-0000-0000-000000000000",
                name="Ghost",
            )


class TestActivateExam:
    def test_activates_inactive(self):
        from exams.services.exam_services import activate_exam, create_exam

        exam = create_exam(
            code="INACTIVE", name="Inactive", exam_type="qualifying", is_active=False
        )
        result = activate_exam(exam_id=exam.id)
        assert result.is_active is True

    def test_noop_when_already_active(self):
        from exams.services.exam_services import activate_exam, create_exam

        exam = create_exam(
            code="ACTIVE", name="Active", exam_type="qualifying", is_active=True
        )
        result = activate_exam(exam_id=exam.id)
        assert result.is_active is True

    def test_raises_when_not_found(self):
        from exams.services.exam_services import activate_exam

        with pytest.raises(ExamNotFoundError):
            activate_exam(exam_id="00000000-0000-0000-0000-000000000000")


class TestDeactivateExam:
    def test_deactivates_active(self):
        from exams.services.exam_services import create_exam, deactivate_exam

        exam = create_exam(
            code="ACTIVE2", name="Active", exam_type="qualifying"
        )
        result = deactivate_exam(exam_id=exam.id)
        assert result.is_active is False

    def test_noop_when_already_inactive(self):
        from exams.services.exam_services import create_exam, deactivate_exam

        exam = create_exam(
            code="INACTIVE2", name="Inactive", exam_type="qualifying", is_active=False
        )
        result = deactivate_exam(exam_id=exam.id)
        assert result.is_active is False

    def test_raises_when_not_found(self):
        from exams.services.exam_services import deactivate_exam

        with pytest.raises(ExamNotFoundError):
            deactivate_exam(exam_id="00000000-0000-0000-0000-000000000000")


class TestDeleteExam:
    def test_delete_deactivates_exam(self):
        from exams.services.exam_services import create_exam, delete_exam

        exam = create_exam(
            code="TODELETE", name="To Delete", exam_type="qualifying"
        )
        delete_exam(exam_id=exam.id)
        exam.refresh_from_db()
        assert exam.is_active is False

    def test_delete_raises_when_not_found(self):
        from exams.services.exam_services import delete_exam

        with pytest.raises(ExamNotFoundError):
            delete_exam(
                exam_id="00000000-0000-0000-0000-000000000000"
            )


class TestExamCodeValidation:
    def test_rejects_lowercase(self):
        from exams.services.exam_services import create_exam

        with pytest.raises(ExamInvalidCodeError):
            create_exam(
                code="ctet_p2_sci",
                name="CTET Paper II (Science)",
                exam_type="qualifying",
            )

    def test_rejects_starting_with_number(self):
        from exams.services.exam_services import create_exam

        with pytest.raises(ExamInvalidCodeError):
            create_exam(
                code="1CTET", name="CTET", exam_type="qualifying"
            )

    def test_rejects_special_chars(self):
        from exams.services.exam_services import create_exam

        with pytest.raises(ExamInvalidCodeError):
            create_exam(
                code="CTET-SCI", name="CTET", exam_type="qualifying"
            )

    def test_accepts_valid_code(self):
        from exams.services.exam_services import create_exam

        exam = create_exam(
            code="CTET_P2_SCI_2024",
            name="CTET Paper II (Science)",
            exam_type="qualifying",
        )
        assert exam.code == "CTET_P2_SCI_2024"

    def test_validates_on_update(self):
        from exams.services.exam_services import create_exam, update_exam

        exam = create_exam(
            code="VALID_CODE", name="Exam", exam_type="qualifying"
        )
        with pytest.raises(ExamInvalidCodeError):
            update_exam(exam_id=exam.id, code="invalid-code")

    def test_allows_code_update_to_valid(self):
        from exams.services.exam_services import create_exam, update_exam

        exam = create_exam(
            code="OLD_CODE", name="Exam", exam_type="qualifying"
        )
        updated = update_exam(exam_id=exam.id, code="NEW_CODE_99")
        assert updated.code == "NEW_CODE_99"


# ── Subject Services ─────────────────────────────────────────────────────────


class TestCreateSubject:
    def test_creates_subject(self, exam):
        from exams.services.exam_services import create_subject

        subject = create_subject(exam_id=exam.id, name="Science", position=1)
        assert subject.name == "Science"
        assert subject.position == 1
        assert subject.exam_id == exam.id

    def test_raises_when_exam_not_found(self):
        from exams.services.exam_services import create_subject

        with pytest.raises(ExamNotFoundError):
            create_subject(
                exam_id="00000000-0000-0000-0000-000000000000",
                name="Science",
            )

    def test_raises_on_duplicate_name(self, exam):
        from exams.services.exam_services import create_subject

        create_subject(exam_id=exam.id, name="Science")
        with pytest.raises(SubjectNameNotUniqueError):
            create_subject(exam_id=exam.id, name="Science")

    def test_allows_same_name_different_exam(self):
        from exams.services.exam_services import create_exam, create_subject

        exam1 = create_exam(code="E1", name="E1", exam_type="qualifying")
        exam2 = create_exam(code="E2", name="E2", exam_type="qualifying")
        create_subject(exam_id=exam1.id, name="Science")
        create_subject(exam_id=exam2.id, name="Science")  # should not raise

    def test_uses_atomic(self, exam):
        from exams.services.exam_services import create_subject

        with pytest.raises(Exception):
            with transaction.atomic():
                create_subject(exam_id=exam.id, name="Atomic")
                raise Exception("rollback")
        assert Subject.objects.filter(name="Atomic").count() == 0


class TestUpdateSubject:
    def test_updates_name(self, exam):
        from exams.services.exam_services import create_subject, update_subject

        subject = create_subject(exam_id=exam.id, name="Science", position=1)
        updated = update_subject(subject_id=subject.id, name="Mathematics")
        assert updated.name == "Mathematics"

    def test_raises_on_duplicate_name(self, exam):
        from exams.services.exam_services import create_subject, update_subject

        create_subject(exam_id=exam.id, name="Existing", position=1)
        subject = create_subject(exam_id=exam.id, name="Target", position=2)
        with pytest.raises(SubjectNameNotUniqueError):
            update_subject(subject_id=subject.id, name="Existing")

    def test_raises_when_not_found(self):
        from exams.services.exam_services import update_subject

        with pytest.raises(SubjectNotFoundError):
            update_subject(
                subject_id="00000000-0000-0000-0000-000000000000",
                name="Ghost",
            )

    def test_updates_position(self, exam):
        from exams.services.exam_services import create_subject, update_subject

        subject = create_subject(exam_id=exam.id, name="Science", position=1)
        updated = update_subject(subject_id=subject.id, position=5)
        assert updated.position == 5


class TestDeleteSubject:
    def test_deletes_subject(self, exam):
        from exams.services.exam_services import create_subject, delete_subject

        subject = create_subject(exam_id=exam.id, name="Science")
        delete_subject(subject_id=subject.id)
        assert Subject.objects.filter(id=subject.id).count() == 0

    def test_raises_when_not_found(self):
        from exams.services.exam_services import delete_subject

        with pytest.raises(SubjectNotFoundError):
            delete_subject(
                subject_id="00000000-0000-0000-0000-000000000000"
            )


# ── Topic Services ────────────────────────────────────────────────────────────


class TestCreateTopic:
    def test_creates_topic(self, subject):
        from exams.services.exam_services import create_topic

        topic = create_topic(subject_id=subject.id, name="Physics", position=1)
        assert topic.name == "Physics"
        assert topic.subject_id == subject.id

    def test_raises_when_subject_not_found(self):
        from exams.services.exam_services import create_topic

        with pytest.raises(SubjectNotFoundError):
            create_topic(
                subject_id="00000000-0000-0000-0000-000000000000",
                name="Physics",
            )

    def test_raises_on_duplicate_name(self, subject):
        from exams.services.exam_services import create_topic

        create_topic(subject_id=subject.id, name="Physics")
        with pytest.raises(TopicNameNotUniqueError):
            create_topic(subject_id=subject.id, name="Physics")

    def test_allows_same_name_different_subject(self, subject):
        from exams.services.exam_services import create_subject, create_topic

        other = create_subject(exam_id=subject.exam_id, name="Other", position=2)
        create_topic(subject_id=subject.id, name="Physics")
        create_topic(subject_id=other.id, name="Physics")  # should not raise

    def test_uses_atomic(self, subject):
        from exams.services.exam_services import create_topic

        with pytest.raises(Exception):
            with transaction.atomic():
                create_topic(subject_id=subject.id, name="Atomic")
                raise Exception("rollback")
        assert Topic.objects.filter(name="Atomic").count() == 0


class TestUpdateTopic:
    def test_updates_name(self, subject):
        from exams.services.exam_services import create_topic, update_topic

        topic = create_topic(subject_id=subject.id, name="Physics", position=1)
        updated = update_topic(topic_id=topic.id, name="Modern Physics")
        assert updated.name == "Modern Physics"

    def test_raises_on_duplicate_name(self, subject):
        from exams.services.exam_services import create_topic, update_topic

        create_topic(subject_id=subject.id, name="Existing", position=1)
        topic = create_topic(subject_id=subject.id, name="Target", position=2)
        with pytest.raises(TopicNameNotUniqueError):
            update_topic(topic_id=topic.id, name="Existing")

    def test_raises_when_not_found(self):
        from exams.services.exam_services import update_topic

        with pytest.raises(TopicNotFoundError):
            update_topic(
                topic_id="00000000-0000-0000-0000-000000000000",
                name="Ghost",
            )


class TestDeleteTopic:
    def test_deletes_topic(self, subject):
        from exams.services.exam_services import create_topic, delete_topic

        topic = create_topic(subject_id=subject.id, name="Physics")
        delete_topic(topic_id=topic.id)
        assert Topic.objects.filter(id=topic.id).count() == 0

    def test_raises_when_not_found(self):
        from exams.services.exam_services import delete_topic

        with pytest.raises(TopicNotFoundError):
            delete_topic(
                topic_id="00000000-0000-0000-0000-000000000000"
            )


# ── Subtopic Services ─────────────────────────────────────────────────────────


class TestCreateSubtopic:
    def test_creates_subtopic(self, topic):
        from exams.services.exam_services import create_subtopic

        subtopic = create_subtopic(
            topic_id=topic.id, name="Motion", position=1
        )
        assert subtopic.name == "Motion"
        assert subtopic.topic_id == topic.id

    def test_raises_when_topic_not_found(self):
        from exams.services.exam_services import create_subtopic

        with pytest.raises(TopicNotFoundError):
            create_subtopic(
                topic_id="00000000-0000-0000-0000-000000000000",
                name="Motion",
            )

    def test_raises_on_duplicate_name(self, topic):
        from exams.services.exam_services import create_subtopic

        create_subtopic(topic_id=topic.id, name="Motion")
        with pytest.raises(SubtopicNameNotUniqueError):
            create_subtopic(topic_id=topic.id, name="Motion")

    def test_allows_same_name_different_topic(self, topic):
        from exams.services.exam_services import create_subtopic, create_topic

        other_topic = create_topic(
            subject_id=topic.subject_id, name="Other Topic", position=2
        )
        create_subtopic(topic_id=topic.id, name="Motion")
        create_subtopic(topic_id=other_topic.id, name="Motion")  # should not raise

    def test_uses_atomic(self, topic):
        from exams.services.exam_services import create_subtopic

        with pytest.raises(Exception):
            with transaction.atomic():
                create_subtopic(topic_id=topic.id, name="Atomic")
                raise Exception("rollback")
        assert Subtopic.objects.filter(name="Atomic").count() == 0


class TestUpdateSubtopic:
    def test_updates_name(self, topic):
        from exams.services.exam_services import create_subtopic, update_subtopic

        subtopic = create_subtopic(topic_id=topic.id, name="Motion", position=1)
        updated = update_subtopic(
            subtopic_id=subtopic.id, name="Kinematics"
        )
        assert updated.name == "Kinematics"

    def test_raises_on_duplicate_name(self, topic):
        from exams.services.exam_services import create_subtopic, update_subtopic

        create_subtopic(topic_id=topic.id, name="Existing", position=1)
        subtopic = create_subtopic(topic_id=topic.id, name="Target", position=2)
        with pytest.raises(SubtopicNameNotUniqueError):
            update_subtopic(subtopic_id=subtopic.id, name="Existing")

    def test_raises_when_not_found(self):
        from exams.services.exam_services import update_subtopic

        with pytest.raises(SubtopicNotFoundError):
            update_subtopic(
                subtopic_id="00000000-0000-0000-0000-000000000000",
                name="Ghost",
            )


class TestDeleteSubtopic:
    def test_deletes_subtopic(self, topic):
        from exams.services.exam_services import create_subtopic, delete_subtopic

        subtopic = create_subtopic(topic_id=topic.id, name="Motion")
        delete_subtopic(subtopic_id=subtopic.id)
        assert Subtopic.objects.filter(id=subtopic.id).count() == 0

    def test_raises_when_not_found(self):
        from exams.services.exam_services import delete_subtopic

        with pytest.raises(SubtopicNotFoundError):
            delete_subtopic(
                subtopic_id="00000000-0000-0000-0000-000000000000"
            )


# ── Syllabus Item Services ────────────────────────────────────────────────────


class TestCreateSyllabusItem:
    def test_creates_item(self, exam):
        from exams.services.exam_services import create_syllabus_item

        item = create_syllabus_item(
            exam_id=exam.id,
            title="Newton's Laws",
            description="Study of forces and motion",
            weightage=15.00,
            position=1,
        )
        assert item.title == "Newton's Laws"
        assert item.exam_id == exam.id
        assert item.weightage == 15.00

    def test_raises_when_exam_not_found(self):
        from exams.services.exam_services import create_syllabus_item

        with pytest.raises(ExamNotFoundError):
            create_syllabus_item(
                exam_id="00000000-0000-0000-0000-000000000000",
                title="Orphan",
            )

    def test_creates_with_parent(self, exam):
        from exams.services.exam_services import create_syllabus_item

        parent = create_syllabus_item(
            exam_id=exam.id, title="Parent Unit", position=1
        )
        child = create_syllabus_item(
            exam_id=exam.id,
            title="Child Topic",
            parent_id=parent.id,
            position=1,
        )
        assert child.parent_id == parent.id

    def test_uses_atomic(self, exam):
        from exams.services.exam_services import create_syllabus_item

        with pytest.raises(Exception):
            with transaction.atomic():
                create_syllabus_item(
                    exam_id=exam.id, title="Atomic Item", position=1
                )
                raise Exception("rollback")
        assert SyllabusItem.objects.filter(title="Atomic Item").count() == 0


class TestUpdateSyllabusItem:
    def test_updates_title(self, exam):
        from exams.services.exam_services import (
            create_syllabus_item,
            update_syllabus_item,
        )

        item = create_syllabus_item(
            exam_id=exam.id, title="Original", position=1
        )
        updated = update_syllabus_item(
            syllabus_item_id=item.id, title="Updated"
        )
        assert updated.title == "Updated"

    def test_updates_weightage(self, exam):
        from exams.services.exam_services import (
            create_syllabus_item,
            update_syllabus_item,
        )

        item = create_syllabus_item(
            exam_id=exam.id, title="Weighted", position=1
        )
        updated = update_syllabus_item(
            syllabus_item_id=item.id, weightage=25.00
        )
        assert updated.weightage == 25.00

    def test_sets_parent_to_none(self, exam):
        from exams.services.exam_services import (
            create_syllabus_item,
            update_syllabus_item,
        )

        parent = create_syllabus_item(
            exam_id=exam.id, title="Parent", position=1
        )
        child = create_syllabus_item(
            exam_id=exam.id, title="Child", parent_id=parent.id, position=1
        )
        updated = update_syllabus_item(
            syllabus_item_id=child.id, parent_id=None
        )
        assert updated.parent is None

    def test_raises_when_not_found(self):
        from exams.exceptions import SyllabusItemNotFoundError
        from exams.services.exam_services import update_syllabus_item

        with pytest.raises(SyllabusItemNotFoundError):
            update_syllabus_item(
                syllabus_item_id="00000000-0000-0000-0000-000000000000",
                title="Ghost",
            )


class TestDeleteSyllabusItem:
    def test_deletes_item(self, exam):
        from exams.services.exam_services import (
            create_syllabus_item,
            delete_syllabus_item,
        )

        item = create_syllabus_item(
            exam_id=exam.id, title="To Delete", position=1
        )
        delete_syllabus_item(syllabus_item_id=item.id)
        assert SyllabusItem.objects.filter(id=item.id).count() == 0

    def test_raises_when_not_found(self):
        from exams.services.exam_services import delete_syllabus_item

        with pytest.raises(SyllabusItemNotFoundError):
            delete_syllabus_item(
                syllabus_item_id="00000000-0000-0000-0000-000000000000"
            )


class TestSyllabusHierarchyValidation:
    def test_parent_must_belong_to_same_exam(self, exam):
        from exams.services.exam_services import (
            create_exam,
            create_syllabus_item,
        )

        other_exam = create_exam(
            code="OTHER", name="Other Exam", exam_type="qualifying"
        )
        parent = create_syllabus_item(
            exam_id=other_exam.id, title="Parent", position=1
        )
        with pytest.raises(SyllabusParentExamMismatchError):
            create_syllabus_item(
                exam_id=exam.id,
                title="Child",
                parent_id=parent.id,
            )

    def test_topic_must_belong_to_exam(self, exam):
        from exams.services.exam_services import (
            create_exam,
            create_syllabus_item,
            create_subject,
            create_topic,
        )

        other_exam = create_exam(
            code="OTHER", name="Other", exam_type="qualifying"
        )
        other_subject = create_subject(
            exam_id=other_exam.id, name="Other Subj"
        )
        other_topic = create_topic(
            subject_id=other_subject.id, name="Other Topic"
        )
        with pytest.raises(SyllabusTopicHierarchyError):
            create_syllabus_item(
                exam_id=exam.id,
                title="Item",
                topic_id=other_topic.id,
            )

    def test_subtopic_must_belong_to_topic(self, exam, subject, topic):
        from exams.services.exam_services import (
            create_syllabus_item,
            create_topic,
            create_subtopic,
        )

        other_topic = create_topic(
            subject_id=subject.id, name="Other Topic", position=2
        )
        other_subtopic = create_subtopic(
            topic_id=other_topic.id, name="Other Subtopic"
        )
        with pytest.raises(SyllabusSubtopicHierarchyError):
            create_syllabus_item(
                exam_id=exam.id,
                title="Item",
                topic_id=topic.id,
                subtopic_id=other_subtopic.id,
            )

    def test_subtopic_requires_topic(self, exam):
        from exams.services.exam_services import (
            create_syllabus_item,
            create_subject,
            create_topic,
            create_subtopic,
        )

        subtopic = create_subtopic(
            topic_id=create_topic(
                subject_id=create_subject(
                    exam_id=exam.id, name="Subj"
                ).id,
                name="Topic",
            ).id,
            name="Subtopic",
        )
        with pytest.raises(SyllabusSubtopicHierarchyError):
            create_syllabus_item(
                exam_id=exam.id,
                title="Item",
                subtopic_id=subtopic.id,
            )


class TestSyllabusCycleDetection:
    def test_rejects_direct_self_parent(self, exam):
        from exams.services.exam_services import (
            create_syllabus_item,
            update_syllabus_item,
        )

        parent = create_syllabus_item(
            exam_id=exam.id, title="Parent", position=1
        )
        child = create_syllabus_item(
            exam_id=exam.id,
            title="Child",
            parent_id=parent.id,
            position=1,
        )
        # Setting parent's parent to child creates cycle
        with pytest.raises(SyllabusCycleError):
            update_syllabus_item(
                syllabus_item_id=parent.id,
                parent_id=child.id,
            )

    def test_rejects_grandparent_cycle(self, exam):
        from exams.services.exam_services import (
            create_syllabus_item,
            update_syllabus_item,
        )

        a = create_syllabus_item(
            exam_id=exam.id, title="A", position=1
        )
        b = create_syllabus_item(
            exam_id=exam.id, title="B", parent_id=a.id, position=1
        )
        c = create_syllabus_item(
            exam_id=exam.id, title="C", parent_id=b.id, position=1
        )
        # Trying to set A's parent to C creates A → B → C → A cycle
        with pytest.raises(SyllabusCycleError):
            update_syllabus_item(
                syllabus_item_id=a.id,
                parent_id=c.id,
            )


class TestSyllabusDepth:
    def test_allows_three_levels(self, exam):
        from exams.services.exam_services import create_syllabus_item

        l1 = create_syllabus_item(
            exam_id=exam.id, title="L1", position=1
        )
        l2 = create_syllabus_item(
            exam_id=exam.id, title="L2", parent_id=l1.id, position=1
        )
        l3 = create_syllabus_item(
            exam_id=exam.id, title="L3", parent_id=l2.id, position=1
        )
        l4 = create_syllabus_item(
            exam_id=exam.id, title="L4", parent_id=l3.id, position=1
        )
        assert l4.title == "L4"

    def test_rejects_five_levels(self, exam):
        from exams.services.exam_services import create_syllabus_item

        l1 = create_syllabus_item(
            exam_id=exam.id, title="L1", position=1
        )
        l2 = create_syllabus_item(
            exam_id=exam.id, title="L2", parent_id=l1.id, position=1
        )
        l3 = create_syllabus_item(
            exam_id=exam.id, title="L3", parent_id=l2.id, position=1
        )
        l4 = create_syllabus_item(
            exam_id=exam.id, title="L4", parent_id=l3.id, position=1
        )
        with pytest.raises(SyllabusDepthExceededError):
            create_syllabus_item(
                exam_id=exam.id,
                title="L5",
                parent_id=l4.id,
                position=1,
            )


# ── Previous Year Paper Services ──────────────────────────────────────────────


class TestCreatePreviousYearPaper:
    def test_creates_paper(self, exam):
        from exams.services.exam_services import create_previous_year_paper

        paper = create_previous_year_paper(
            exam_id=exam.id,
            code="CTET_P2_SCI_2024_AS",
            year=2024,
            total_questions=150,
        )
        assert paper.code == "CTET_P2_SCI_2024_AS"
        assert paper.year == 2024
        assert paper.total_questions == 150
        assert paper.exam_id == exam.id

    def test_raises_when_exam_not_found(self):
        from exams.services.exam_services import create_previous_year_paper

        with pytest.raises(ExamNotFoundError):
            create_previous_year_paper(
                exam_id="00000000-0000-0000-0000-000000000000",
                code="PAPER",
                year=2024,
            )

    def test_raises_on_duplicate(self, exam):
        from exams.services.exam_services import create_previous_year_paper

        create_previous_year_paper(
            exam_id=exam.id, code="PAPER", year=2024
        )
        with pytest.raises(PaperNotUniqueError):
            create_previous_year_paper(
                exam_id=exam.id, code="PAPER", year=2024
            )

    def test_allows_same_code_different_year(self, exam):
        from exams.services.exam_services import create_previous_year_paper

        create_previous_year_paper(
            exam_id=exam.id, code="PAPER", year=2024
        )
        create_previous_year_paper(
            exam_id=exam.id, code="PAPER", year=2025
        )  # should not raise

    def test_uses_atomic(self, exam):
        from exams.services.exam_services import create_previous_year_paper

        with pytest.raises(Exception):
            with transaction.atomic():
                create_previous_year_paper(
                    exam_id=exam.id, code="ATOMIC", year=2024
                )
                raise Exception("rollback")
        assert PreviousYearPaper.objects.filter(code="ATOMIC").count() == 0


class TestUpdatePreviousYearPaper:
    def test_updates_code(self, exam):
        from exams.services.exam_services import (
            create_previous_year_paper,
            update_previous_year_paper,
        )

        paper = create_previous_year_paper(
            exam_id=exam.id, code="ORIGINAL", year=2024
        )
        updated = update_previous_year_paper(
            paper_id=paper.id, code="UPDATED"
        )
        assert updated.code == "UPDATED"

    def test_raises_on_duplicate_code(self, exam):
        from exams.services.exam_services import (
            create_previous_year_paper,
            update_previous_year_paper,
        )

        create_previous_year_paper(
            exam_id=exam.id, code="EXISTING", year=2024
        )
        paper = create_previous_year_paper(
            exam_id=exam.id, code="TARGET", year=2024
        )
        with pytest.raises(PaperNotUniqueError):
            update_previous_year_paper(
                paper_id=paper.id, code="EXISTING"
            )

    def test_raises_when_not_found(self):
        from exams.services.exam_services import update_previous_year_paper

        with pytest.raises(PreviousYearPaperNotFoundError):
            update_previous_year_paper(
                paper_id="00000000-0000-0000-0000-000000000000",
                code="Ghost",
            )

    def test_updates_file_path(self, exam):
        from exams.services.exam_services import (
            create_previous_year_paper,
            update_previous_year_paper,
        )

        paper = create_previous_year_paper(
            exam_id=exam.id, code="FILE_TEST", year=2024
        )
        updated = update_previous_year_paper(
            paper_id=paper.id, file_path="/uploads/new.pdf"
        )
        assert updated.file_path == "/uploads/new.pdf"

    def test_sets_file_path_to_none(self, exam):
        from exams.services.exam_services import (
            create_previous_year_paper,
            update_previous_year_paper,
        )

        paper = create_previous_year_paper(
            exam_id=exam.id,
            code="NULL_FILE",
            year=2024,
            file_path="/uploads/old.pdf",
        )
        updated = update_previous_year_paper(
            paper_id=paper.id, file_path=None
        )
        assert updated.file_path is None


class TestDeletePreviousYearPaper:
    def test_deletes_paper(self, exam):
        from exams.services.exam_services import (
            create_previous_year_paper,
            delete_previous_year_paper,
        )

        paper = create_previous_year_paper(
            exam_id=exam.id, code="DELETE_ME", year=2024
        )
        delete_previous_year_paper(paper_id=paper.id)
        assert PreviousYearPaper.objects.filter(id=paper.id).count() == 0

    def test_raises_when_not_found(self):
        from exams.services.exam_services import delete_previous_year_paper

        with pytest.raises(PreviousYearPaperNotFoundError):
            delete_previous_year_paper(
                paper_id="00000000-0000-0000-0000-000000000000"
            )


class TestYearValidation:
    def test_rejects_year_before_2000(self, exam):
        from exams.services.exam_services import create_previous_year_paper

        with pytest.raises(InvalidYearError):
            create_previous_year_paper(
                exam_id=exam.id, code="OLD", year=1999
            )

    def test_rejects_year_far_in_future(self, exam):
        from exams.services.exam_services import create_previous_year_paper

        with pytest.raises(InvalidYearError):
            create_previous_year_paper(
                exam_id=exam.id, code="FUTURE", year=2100
            )

    def test_accepts_current_year(self, exam):
        from datetime import date

        from exams.services.exam_services import create_previous_year_paper

        paper = create_previous_year_paper(
            exam_id=exam.id,
            code="CURRENT_YEAR",
            year=date.today().year,
        )
        assert paper.year == date.today().year

    def test_accepts_next_year(self, exam):
        from datetime import date

        from exams.services.exam_services import create_previous_year_paper

        paper = create_previous_year_paper(
            exam_id=exam.id,
            code="NEXT_YEAR",
            year=date.today().year + 1,
        )
        assert paper.year == date.today().year + 1

    def test_validates_on_update(self, exam):
        from exams.services.exam_services import (
            create_previous_year_paper,
            update_previous_year_paper,
        )

        paper = create_previous_year_paper(
            exam_id=exam.id, code="YEAR_TEST", year=2024
        )
        with pytest.raises(InvalidYearError):
            update_previous_year_paper(
                paper_id=paper.id, year=1999
            )


class TestLanguageValidation:
    def test_accepts_assamese(self, exam):
        from exams.services.exam_services import create_previous_year_paper

        paper = create_previous_year_paper(
            exam_id=exam.id, code="AS", year=2024, language="as"
        )
        assert paper.language == "as"

    def test_accepts_english(self, exam):
        from exams.services.exam_services import create_previous_year_paper

        paper = create_previous_year_paper(
            exam_id=exam.id, code="EN", year=2024, language="en"
        )
        assert paper.language == "en"

    def test_rejects_unknown(self, exam):
        from exams.services.exam_services import create_previous_year_paper

        with pytest.raises(InvalidLanguageCodeError):
            create_previous_year_paper(
                exam_id=exam.id,
                code="INVALID_LANG",
                year=2024,
                language="fr",
            )

    def test_validates_on_update(self, exam):
        from exams.services.exam_services import (
            create_previous_year_paper,
            update_previous_year_paper,
        )

        paper = create_previous_year_paper(
            exam_id=exam.id, code="LANG_TEST", year=2024
        )
        with pytest.raises(InvalidLanguageCodeError):
            update_previous_year_paper(
                paper_id=paper.id, language="de"
            )


# ── Selector Reuse Verification ───────────────────────────────────────────────


class TestSelectorReuse:
    def test_create_subject_calls_get_exam_by_id(self, exam, monkeypatch):
        import exams.services.exam_services as svc

        original = svc.get_exam_by_id
        calls = []

        def spy(*args, **kwargs):
            calls.append(1)
            return original(*args, **kwargs)

        monkeypatch.setattr(
            "exams.services.exam_services.get_exam_by_id", spy
        )
        svc.create_subject(exam_id=exam.id, name="Science")
        assert len(calls) == 1

    def test_update_subject_calls_get_subject_by_id(self, exam, monkeypatch):
        import exams.services.exam_services as svc

        subject = svc.create_subject(exam_id=exam.id, name="Original")
        original = svc.get_subject_by_id
        calls = []

        def spy(*args, **kwargs):
            calls.append(1)
            return original(*args, **kwargs)

        monkeypatch.setattr(
            "exams.services.exam_services.get_subject_by_id", spy
        )
        svc.update_subject(subject_id=subject.id, name="Updated")
        assert len(calls) == 1

    def test_delete_subject_calls_get_subject_by_id(self, exam, monkeypatch):
        import exams.services.exam_services as svc

        subject = svc.create_subject(exam_id=exam.id, name="DelMe")
        original = svc.get_subject_by_id
        calls = []

        def spy(*args, **kwargs):
            calls.append(1)
            return original(*args, **kwargs)

        monkeypatch.setattr(
            "exams.services.exam_services.get_subject_by_id", spy
        )
        svc.delete_subject(subject_id=subject.id)
        assert len(calls) == 1

    def test_delete_topic_calls_get_topic_by_id(self, subject, monkeypatch):
        import exams.services.exam_services as svc

        topic = svc.create_topic(subject_id=subject.id, name="DelMe")
        original = svc.get_topic_by_id
        calls = []

        def spy(*args, **kwargs):
            calls.append(1)
            return original(*args, **kwargs)

        monkeypatch.setattr(
            "exams.services.exam_services.get_topic_by_id", spy
        )
        svc.delete_topic(topic_id=topic.id)
        assert len(calls) == 1
