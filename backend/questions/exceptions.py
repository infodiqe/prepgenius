class QuestionDomainError(Exception):
    """Base exception for all question domain errors."""


class QuestionNotFoundError(QuestionDomainError):
    def __init__(self, question_id: str) -> None:
        self.question_id = question_id
        super().__init__(f"Question not found: {question_id}")


class QuestionOptionNotFoundError(QuestionDomainError):
    def __init__(self, option_id: str) -> None:
        self.option_id = option_id
        super().__init__(f"Question option not found: {option_id}")


class QuestionAppearanceNotFoundError(QuestionDomainError):
    def __init__(self, appearance_id: str) -> None:
        self.appearance_id = appearance_id
        super().__init__(f"Question appearance not found: {appearance_id}")


class QuestionStatNotFoundError(QuestionDomainError):
    def __init__(self, question_id: str) -> None:
        self.question_id = question_id
        super().__init__(f"Question stats not found: {question_id}")


class AiGeneratedQuestionNotFoundError(QuestionDomainError):
    def __init__(self, ai_gen_id: str) -> None:
        self.ai_gen_id = ai_gen_id
        super().__init__(f"AI generated question not found: {ai_gen_id}")


class QuestionOptionLabelNotUniqueError(QuestionDomainError):
    def __init__(self, label: str, question_id: str) -> None:
        self.label = label
        self.question_id = question_id
        super().__init__(
            f"Option label '{label}' already exists in question {question_id}"
        )


class QuestionAppearanceNotUniqueError(QuestionDomainError):
    def __init__(self, question_id: str, paper_id: str) -> None:
        self.question_id = question_id
        self.paper_id = paper_id
        super().__init__(
            f"Appearance already exists for question {question_id} "
            f"in paper {paper_id}"
        )


class InvalidReviewTransitionError(QuestionDomainError):
    def __init__(self, from_status: str, to_status: str) -> None:
        self.from_status = from_status
        self.to_status = to_status
        super().__init__(
            f"Invalid review status transition: "
            f"'{from_status}' → '{to_status}'"
        )


class QuestionHasNoCorrectOptionError(QuestionDomainError):
    def __init__(self, question_id: str) -> None:
        self.question_id = question_id
        super().__init__(
            f"Question {question_id} must have at least one correct option"
        )


class QuestionHasMultipleCorrectOptionsError(QuestionDomainError):
    def __init__(self, question_id: str) -> None:
        self.question_id = question_id
        super().__init__(
            f"Question {question_id} must have exactly one correct option"
        )


class QuestionAppearanceYearMismatchError(QuestionDomainError):
    def __init__(self, year: int, paper_year: int) -> None:
        self.year = year
        self.paper_year = paper_year
        super().__init__(
            f"Appearance year {year} does not match paper year {paper_year}"
        )


class AiGeneratedQuestionInvalidStateError(QuestionDomainError):
    def __init__(self, ai_gen_id: str, current_status: str, expected_status: str) -> None:
        self.ai_gen_id = ai_gen_id
        self.current_status = current_status
        self.expected_status = expected_status
        super().__init__(
            f"AI generated question {ai_gen_id} has status '{current_status}', "
            f"expected '{expected_status}'"
        )


class QuestionAlreadyClaimedError(QuestionDomainError):
    def __init__(self, question_id: str, claimed_by_id: str) -> None:
        self.question_id = question_id
        self.claimed_by_id = claimed_by_id
        super().__init__(
            f"Question {question_id} is already claimed by user {claimed_by_id}"
        )


class QuestionNotClaimedError(QuestionDomainError):
    def __init__(self, question_id: str) -> None:
        self.question_id = question_id
        super().__init__(f"Question {question_id} is not claimed by anyone")


class ApprovalRequiredForPublishError(QuestionDomainError):
    def __init__(self, question_id: str) -> None:
        self.question_id = question_id
        super().__init__(
            f"Question {question_id} requires at least one approval before publishing"
        )
