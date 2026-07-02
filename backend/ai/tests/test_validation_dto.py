from ai.validation.dto import ValidatedQuestion, ValidationIssue, ValidationResult
from ai.tests.validation_utils import good_question


def _issue(sev):
    return ValidationIssue(code="c", severity=sev, field="f", message="m")


class TestValidationDtos:
    def test_issue_to_dict(self):
        assert _issue("error").to_dict() == {
            "code": "c",
            "severity": "error",
            "field": "f",
            "message": "m",
        }

    def test_result_to_dict(self):
        result = ValidationResult(valid=False, errors=[_issue("error")], warnings=[_issue("warning")])
        d = result.to_dict()
        assert d["valid"] is False
        assert len(d["errors"]) == 1
        assert len(d["warnings"]) == 1

    def test_validated_question_proxies_and_serializes(self):
        result = ValidationResult(valid=True, errors=[], warnings=[_issue("warning")])
        vq = ValidatedQuestion(normalized_question=good_question(), result=result)
        assert vq.valid is True
        assert vq.errors == []
        assert len(vq.warnings) == 1
        d = vq.to_dict()
        assert d["valid"] is True
        assert d["normalized_question"]["stem"] == "What is 2 + 2?"
        assert len(d["warnings"]) == 1
