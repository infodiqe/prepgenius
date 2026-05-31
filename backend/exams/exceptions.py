class ExamDomainError(Exception):
    """Base exception for all exam domain errors."""


class ExamNotFoundError(ExamDomainError):
    def __init__(self, exam_id: str) -> None:
        self.exam_id = exam_id
        super().__init__(f"Exam not found: {exam_id}")


class SubjectNotFoundError(ExamDomainError):
    def __init__(self, subject_id: str) -> None:
        self.subject_id = subject_id
        super().__init__(f"Subject not found: {subject_id}")


class TopicNotFoundError(ExamDomainError):
    def __init__(self, topic_id: str) -> None:
        self.topic_id = topic_id
        super().__init__(f"Topic not found: {topic_id}")


class SubtopicNotFoundError(ExamDomainError):
    def __init__(self, subtopic_id: str) -> None:
        self.subtopic_id = subtopic_id
        super().__init__(f"Subtopic not found: {subtopic_id}")


class SyllabusItemNotFoundError(ExamDomainError):
    def __init__(self, syllabus_item_id: str) -> None:
        self.syllabus_item_id = syllabus_item_id
        super().__init__(f"Syllabus item not found: {syllabus_item_id}")


class PreviousYearPaperNotFoundError(ExamDomainError):
    def __init__(self, paper_id: str) -> None:
        self.paper_id = paper_id
        super().__init__(f"Previous year paper not found: {paper_id}")


# ── Validation errors ────────────────────────────────────────────────────────


class ExamCodeNotUniqueError(ExamDomainError):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(f"Exam code already exists: {code}")


class SubjectNameNotUniqueError(ExamDomainError):
    def __init__(self, name: str, exam_id: str) -> None:
        self.name = name
        self.exam_id = exam_id
        super().__init__(f"Subject name '{name}' already exists in exam {exam_id}")


class TopicNameNotUniqueError(ExamDomainError):
    def __init__(self, name: str, subject_id: str) -> None:
        self.name = name
        self.subject_id = subject_id
        super().__init__(f"Topic name '{name}' already exists in subject {subject_id}")


class SubtopicNameNotUniqueError(ExamDomainError):
    def __init__(self, name: str, topic_id: str) -> None:
        self.name = name
        self.topic_id = topic_id
        super().__init__(f"Subtopic name '{name}' already exists in topic {topic_id}")


class PaperNotUniqueError(ExamDomainError):
    def __init__(self, exam_id: str, year: int, code: str) -> None:
        self.exam_id = exam_id
        self.year = year
        self.code = code
        super().__init__(
            f"Paper already exists for exam {exam_id}, year {year}: {code}"
        )


class ExamInvalidCodeError(ExamDomainError):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(
            f"Exam code must match pattern ^[A-Z][A-Z0-9_]+$: {code}"
        )


class InvalidYearError(ExamDomainError):
    def __init__(self, year: int) -> None:
        self.year = year
        super().__init__(
            f"Year must be between 2000 and current year + 1: {year}"
        )


class InvalidLanguageCodeError(ExamDomainError):
    def __init__(self, code: str) -> None:
        self.code = code
        super().__init__(
            f"Invalid language code. Must be one of as, en, hi, bn: {code}"
        )


class SyllabusCycleError(ExamDomainError):
    def __init__(self, item_id: str) -> None:
        self.item_id = item_id
        super().__init__(
            f"Setting this parent would create a cycle in syllabus item: {item_id}"
        )


class SyllabusParentExamMismatchError(ExamDomainError):
    def __init__(self, parent_id: str, exam_id: str) -> None:
        self.parent_id = parent_id
        self.exam_id = exam_id
        super().__init__(
            f"Syllabus parent {parent_id} does not belong to exam {exam_id}"
        )


class SyllabusDepthExceededError(ExamDomainError):
    def __init__(self, max_depth: int) -> None:
        self.max_depth = max_depth
        super().__init__(
            f"Syllabus tree exceeds maximum depth of {max_depth} levels"
        )


class SyllabusTopicHierarchyError(ExamDomainError):
    def __init__(self, topic_id: str, exam_id: str) -> None:
        self.topic_id = topic_id
        self.exam_id = exam_id
        super().__init__(
            f"Topic {topic_id} does not belong to the exam hierarchy of exam {exam_id}"
        )


class SyllabusSubtopicHierarchyError(ExamDomainError):
    def __init__(self, subtopic_id: str, topic_id: str) -> None:
        self.subtopic_id = subtopic_id
        self.topic_id = topic_id
        super().__init__(
            f"Subtopic {subtopic_id} does not belong to topic {topic_id}"
        )
