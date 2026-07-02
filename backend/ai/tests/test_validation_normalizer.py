from ai.generation.dto import GeneratedQuestion, QuestionOption
from ai.validation.normalizer import (
    QuestionNormalizer,
    _clean_text,
    _index_to_label,
    _normalize_language,
    _normalize_tags,
)
from ai.tests.validation_utils import good_question


class TestCleanText:
    def test_trims_and_collapses_whitespace(self):
        assert _clean_text("  a   b\n\tc  ") == "a b c"

    def test_removes_html(self):
        assert _clean_text("<b>bold</b> &amp; <i>x</i>") == "bold & x"

    def test_removes_markdown_bold_italic_code(self):
        assert _clean_text("**bold** *italic* `code`") == "bold italic code"

    def test_removes_headings_and_blockquote(self):
        assert _clean_text("## Title") == "Title"
        assert _clean_text("> quoted") == "quoted"

    def test_converts_links_and_images(self):
        assert _clean_text("[text](http://x)") == "text"
        assert _clean_text("![alt](http://y)") == "alt"

    def test_folds_smart_quotes_and_dashes(self):
        assert _clean_text("“hi” ‘a’ — …") == '"hi" \'a\' - ...'

    def test_removes_code_fences(self):
        assert _clean_text("```json\nx\n```") == "json x"

    def test_non_string_input_coerced(self):
        assert _clean_text(123) == "123"
        assert _clean_text(None) == ""


class TestIndexToLabel:
    def test_basic(self):
        assert _index_to_label(0) == "A"
        assert _index_to_label(3) == "D"
        assert _index_to_label(25) == "Z"

    def test_wraps_past_z(self):
        assert _index_to_label(26) == "AA"
        assert _index_to_label(27) == "AB"


class TestNormalizeLanguage:
    def test_aliases(self):
        assert _normalize_language("English") == "en"
        assert _normalize_language("Assamese") == "as"
        assert _normalize_language("Hindi") == "hi"

    def test_region_stripped(self):
        assert _normalize_language("en-US") == "en"
        assert _normalize_language("hi_IN") == "hi"

    def test_unknown_passthrough_lowered(self):
        assert _normalize_language("FR") == "fr"


class TestNormalizeTags:
    def test_dedup_case_insensitive_and_sorted(self):
        assert _normalize_tags(["Math", "math", "algebra"]) == ["algebra", "Math"]

    def test_drops_empty_and_whitespace(self):
        assert _normalize_tags(["  ", "x", ""]) == ["x"]

    def test_non_list_returns_empty(self):
        assert _normalize_tags("nope") == []
        assert _normalize_tags(None) == []


class TestQuestionNormalizer:
    def test_relabels_options_by_position(self):
        q = good_question(
            options=[
                QuestionOption("a)", "one", False),
                QuestionOption("(b)", "two", True),
                QuestionOption("iii", "three", False),
                QuestionOption("", "four", False),
            ],
            correct_answer="b",
        )
        nq = QuestionNormalizer().normalize(q)
        assert [o.label for o in nq.options] == ["A", "B", "C", "D"]
        assert nq.correct_answer == "B"

    def test_correct_answer_from_flag_when_label_unmatched(self):
        q = good_question(correct_answer="Z")  # no such label; flag on B
        nq = QuestionNormalizer().normalize(q)
        assert nq.correct_answer == "B"

    def test_correct_answer_blank_when_ambiguous(self):
        opts = [
            QuestionOption("A", "x", True),
            QuestionOption("B", "y", True),
        ]
        q = good_question(options=opts, correct_answer="")
        nq = QuestionNormalizer().normalize(q)
        assert nq.correct_answer == ""

    def test_is_correct_flags_are_preserved(self):
        opts = [
            QuestionOption("A", "x", True),
            QuestionOption("B", "y", True),
        ]
        nq = QuestionNormalizer().normalize(good_question(options=opts, correct_answer=""))
        assert sum(o.is_correct for o in nq.options) == 2  # not silently fixed

    def test_non_list_options_becomes_empty(self):
        q = GeneratedQuestion(
            stem="s", options="oops", correct_answer="", explanation="e",
            difficulty="medium", bloom_level="apply", estimated_time_seconds=10,
            tags=[], learning_objective="lo", language="en", question_type="single_correct",
        )
        nq = QuestionNormalizer().normalize(q)
        assert nq.options == []

    def test_enum_synonyms_mapped(self):
        nq = QuestionNormalizer().normalize(
            good_question(difficulty="Difficult", bloom_level="Understanding", language="English")
        )
        assert nq.difficulty == "hard"
        assert nq.bloom_level == "understand"
        assert nq.language == "en"
