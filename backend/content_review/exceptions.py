class ContentReviewDomainError(Exception):
    """Base exception for all content review domain errors."""


class ContentReviewQuestionRequiredError(ContentReviewDomainError):
    def __init__(self) -> None:
        super().__init__(
            "Either question_id or ai_generated_question_id is required"
        )


class ContentReviewQuestionNotFoundError(ContentReviewDomainError):
    def __init__(self, question_id: str) -> None:
        self.question_id = question_id
        super().__init__(f"Question not found: {question_id}")


class ContentApprovalAlreadyExistsError(ContentReviewDomainError):
    def __init__(self, question_id: str, level: str) -> None:
        self.question_id = question_id
        self.level = level
        super().__init__(
            f"Approval already exists for question {question_id} "
            f"at level '{level}'"
        )
