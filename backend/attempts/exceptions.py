class AttemptDomainError(Exception):
    """Base exception for all attempt domain errors."""


class MockTestNotFoundError(AttemptDomainError):
    def __init__(self, mock_test_id: str) -> None:
        self.mock_test_id = mock_test_id
        super().__init__(f"Mock test not found: {mock_test_id}")


class MockTestQuestionNotFoundError(AttemptDomainError):
    def __init__(self, mock_test_question_id: str) -> None:
        self.mock_test_question_id = mock_test_question_id
        super().__init__(
            f"Mock test question not found: {mock_test_question_id}"
        )


class ExamAttemptNotFoundError(AttemptDomainError):
    def __init__(self, attempt_id: str) -> None:
        self.attempt_id = attempt_id
        super().__init__(f"Exam attempt not found: {attempt_id}")


class UserAnswerNotFoundError(AttemptDomainError):
    def __init__(self, answer_id: str) -> None:
        self.answer_id = answer_id
        super().__init__(f"User answer not found: {answer_id}")


class MockTestNotPublishedError(AttemptDomainError):
    def __init__(self, mock_test_id: str) -> None:
        self.mock_test_id = mock_test_id
        super().__init__(
            f"Mock test {mock_test_id} is not published and cannot be attempted"
        )


class MockTestQuestionNotUniqueError(AttemptDomainError):
    def __init__(self, mock_test_id: str, question_id: str) -> None:
        self.mock_test_id = mock_test_id
        self.question_id = question_id
        super().__init__(
            f"Question {question_id} already exists in mock test {mock_test_id}"
        )


class AttemptAlreadySubmittedError(AttemptDomainError):
    def __init__(self, attempt_id: str) -> None:
        self.attempt_id = attempt_id
        super().__init__(f"Exam attempt {attempt_id} has already been submitted")


class AttemptAlreadyScoredError(AttemptDomainError):
    def __init__(self, attempt_id: str) -> None:
        self.attempt_id = attempt_id
        super().__init__(f"Exam attempt {attempt_id} has already been scored")


class InvalidAttemptTransitionError(AttemptDomainError):
    def __init__(self, from_status: str, to_status: str) -> None:
        self.from_status = from_status
        self.to_status = to_status
        super().__init__(
            f"Invalid attempt status transition: "
            f"'{from_status}' → '{to_status}'"
        )


class DuplicateAnswerError(AttemptDomainError):
    def __init__(self, attempt_id: str, question_id: str) -> None:
        self.attempt_id = attempt_id
        self.question_id = question_id
        super().__init__(
            f"Answer already exists for question {question_id} "
            f"in attempt {attempt_id}"
        )


class InvalidPracticeScopeError(AttemptDomainError):
    """Raised for an unknown scope_type or a missing scope_id (topic/subject)."""

    def __init__(self, scope_type: str, reason: str | None = None) -> None:
        self.scope_type = scope_type
        message = f"Invalid practice scope: {scope_type}"
        if reason:
            message += f" ({reason})"
        super().__init__(message)


class NoPracticeQuestionsError(AttemptDomainError):
    """Raised when no published questions exist for the requested scope."""

    def __init__(self, scope_type: str, scope_id: str | None = None) -> None:
        self.scope_type = scope_type
        self.scope_id = scope_id
        super().__init__(
            f"No published questions available for {scope_type} practice "
            f"(scope_id={scope_id})"
        )
