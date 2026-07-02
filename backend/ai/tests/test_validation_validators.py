import pytest

from ai.generation.dto import QuestionOption
from ai.validation import QuestionValidationService
from ai.validation.enums import Severity, ValidationCode
from ai.tests.validation_utils import good_question

SERVICE = QuestionValidationService()


def error_codes(question):
    return {i.code for i in SERVICE.validate(question).errors}


def warning_codes(question):
    return {i.code for i in SERVICE.validate(question).warnings}


class TestRequiredContent:
    def test_missing_stem(self):
        assert ValidationCode.QUESTION_MISSING.value in error_codes(good_question(stem="   "))

    def test_missing_explanation(self):
        assert ValidationCode.EXPLANATION_MISSING.value in error_codes(good_question(explanation=""))

    def test_missing_learning_objective(self):
        assert ValidationCode.LEARNING_OBJECTIVE_MISSING.value in error_codes(
            good_question(learning_objective="")
        )


class TestOptionsStructure:
    def test_options_missing(self):
        codes = error_codes(good_question(options=[]))
        assert ValidationCode.OPTIONS_MISSING.value in codes

    def test_too_few_options(self):
        opts = [
            QuestionOption("A", "1", False),
            QuestionOption("B", "2", True),
            QuestionOption("C", "3", False),
        ]
        assert ValidationCode.TOO_FEW_OPTIONS.value in error_codes(good_question(options=opts))

    def test_duplicate_options(self):
        opts = [
            QuestionOption("A", "same", False),
            QuestionOption("B", "same", True),
            QuestionOption("C", "3", False),
            QuestionOption("D", "4", False),
        ]
        assert ValidationCode.DUPLICATE_OPTIONS.value in error_codes(good_question(options=opts))

    def test_empty_option_text(self):
        opts = [
            QuestionOption("A", "   ", False),
            QuestionOption("B", "2", True),
            QuestionOption("C", "3", False),
            QuestionOption("D", "4", False),
        ]
        assert ValidationCode.EMPTY_OPTION_TEXT.value in error_codes(good_question(options=opts))


class TestCorrectness:
    def test_no_correct(self):
        opts = [QuestionOption(chr(65 + i), str(i), False) for i in range(4)]
        assert ValidationCode.NO_CORRECT.value in error_codes(good_question(options=opts, correct_answer=""))

    def test_multiple_correct(self):
        opts = [
            QuestionOption("A", "1", True),
            QuestionOption("B", "2", True),
            QuestionOption("C", "3", False),
            QuestionOption("D", "4", False),
        ]
        assert ValidationCode.MULTIPLE_CORRECT.value in error_codes(good_question(options=opts))

    def test_correctness_skipped_when_no_options(self):
        codes = error_codes(good_question(options=[]))
        assert ValidationCode.NO_CORRECT.value not in codes
        assert ValidationCode.MULTIPLE_CORRECT.value not in codes


class TestTaxonomy:
    def test_unsupported_difficulty(self):
        assert ValidationCode.UNSUPPORTED_DIFFICULTY.value in error_codes(
            good_question(difficulty="klingon")
        )

    def test_unsupported_bloom(self):
        assert ValidationCode.UNSUPPORTED_BLOOM.value in error_codes(good_question(bloom_level="wizard"))

    def test_unsupported_language(self):
        assert ValidationCode.UNSUPPORTED_LANGUAGE.value in error_codes(good_question(language="fr"))


class TestMetadata:
    @pytest.mark.parametrize("value", [1.5, -0.1])
    def test_confidence_out_of_range(self, value):
        assert ValidationCode.CONFIDENCE_OUT_OF_RANGE.value in error_codes(
            good_question(confidence_score=value)
        )

    def test_confidence_missing_is_warning(self):
        assert ValidationCode.CONFIDENCE_MISSING.value in warning_codes(
            good_question(confidence_score=None)
        )

    @pytest.mark.parametrize("value", [0, -5])
    def test_non_positive_time(self, value):
        assert ValidationCode.NON_POSITIVE_TIME.value in error_codes(
            good_question(estimated_time_seconds=value)
        )

    @pytest.mark.parametrize("tags", ["notalist", [""], [1], ["ok", "  "]])
    def test_malformed_tags(self, tags):
        assert ValidationCode.MALFORMED_TAGS.value in error_codes(good_question(tags=tags))

    def test_empty_tags_is_warning(self):
        assert ValidationCode.TAGS_EMPTY.value in warning_codes(good_question(tags=[]))


class TestSeverityAssignment:
    def test_reject_rules_are_errors(self):
        result = SERVICE.validate(good_question(stem=""))
        assert all(i.severity == Severity.ERROR.value for i in result.errors)

    def test_issue_fields_populated(self):
        issue = SERVICE.validate(good_question(stem="")).errors[0]
        assert issue.code and issue.severity and issue.field and issue.message
