from ai.validation import (
    QuestionValidationService,
    ValidationContext,
    ValidationIssue,
    Validator,
    default_validators,
)
from ai.validation.enums import Severity
from ai.tests.validation_utils import good_question


class TestServiceHappyPath:
    def test_valid_question(self):
        vq = QuestionValidationService().validate(good_question())
        assert vq.valid is True
        assert vq.errors == []
        assert vq.warnings == []
        assert vq.normalized_question.correct_answer == "B"

    def test_normalizes_before_validating(self):
        # Markdown/HTML/smart quotes + synonym enums must not cause rejection.
        vq = QuestionValidationService().validate(
            good_question(
                stem="**What** is <b>2+2</b>?",
                difficulty="Medium",
                bloom_level="Applying",
                language="English",
            )
        )
        assert vq.valid is True
        assert vq.normalized_question.stem == "What is 2+2?"
        assert vq.normalized_question.difficulty == "medium"
        assert vq.normalized_question.language == "en"


class TestServiceReport:
    def test_invalid_report_shape(self):
        vq = QuestionValidationService().validate(good_question(stem="", explanation=""))
        assert vq.valid is False
        report = vq.to_dict()
        assert report["valid"] is False
        assert len(report["errors"]) >= 2
        assert "normalized_question" in report
        assert report["normalized_question"]["source"] == "ai"

    def test_warnings_do_not_invalidate(self):
        vq = QuestionValidationService().validate(good_question(tags=[], confidence_score=None))
        assert vq.valid is True
        assert len(vq.warnings) == 2

    def test_validate_many(self):
        results = QuestionValidationService().validate_many(
            [good_question(), good_question(stem="")]
        )
        assert [r.valid for r in results] == [True, False]


class TestExtensibility:
    def test_custom_validator_appended_without_touching_existing(self):
        class AlwaysWarns(Validator):
            def validate(self, ctx: ValidationContext) -> list[ValidationIssue]:
                return [
                    ValidationIssue(
                        code="custom_warning",
                        severity=Severity.WARNING.value,
                        field="stem",
                        message="custom",
                    )
                ]

        service = QuestionValidationService(validators=[*default_validators(), AlwaysWarns()])
        vq = service.validate(good_question())
        assert vq.valid is True
        assert any(w.code == "custom_warning" for w in vq.warnings)

    def test_custom_error_validator_can_reject(self):
        class AlwaysErrors(Validator):
            def validate(self, ctx: ValidationContext) -> list[ValidationIssue]:
                return [
                    ValidationIssue(
                        code="curriculum_misaligned",
                        severity=Severity.ERROR.value,
                        field="stem",
                        message="off-syllabus",
                    )
                ]

        service = QuestionValidationService(validators=[AlwaysErrors()])
        vq = service.validate(good_question())
        assert vq.valid is False
        assert vq.errors[0].code == "curriculum_misaligned"

    def test_empty_pipeline_is_always_valid(self):
        service = QuestionValidationService(validators=[])
        assert service.validate(good_question(stem="")).valid is True

    def test_default_pipeline_size(self):
        assert len(default_validators()) == 5

    def test_context_carries_raw_and_normalized(self):
        seen = {}

        class Capture(Validator):
            def validate(self, ctx: ValidationContext) -> list[ValidationIssue]:
                seen["raw"] = ctx.raw
                seen["normalized"] = ctx.normalized
                seen["extra"] = ctx.extra
                return []

        QuestionValidationService(validators=[Capture()]).validate(
            good_question(stem="  x  ")
        )
        assert seen["raw"].stem == "  x  "
        assert seen["normalized"].stem == "x"
        assert seen["extra"] == {}
