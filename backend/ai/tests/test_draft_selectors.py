import uuid

import pytest

from accounts.tests.factories import UserFactory
from ai.models import DraftStatus
from ai.selectors import get_ai_draft, list_ai_drafts
from ai.tests.factories import AIQuestionDraftFactory

pytestmark = pytest.mark.django_db


class TestGetAiDraft:
    def test_found(self):
        draft = AIQuestionDraftFactory()
        assert get_ai_draft(draft_id=draft.id) == draft

    def test_missing(self):
        assert get_ai_draft(draft_id=uuid.uuid4()) is None


class TestListAiDrafts:
    def test_filters(self):
        AIQuestionDraftFactory(exam="CTET", subject="Maths", difficulty="easy", language="en")
        AIQuestionDraftFactory(exam="SSC", subject="GK", difficulty="hard", language="hi")
        assert list_ai_drafts(exam="CTET").count() == 1
        assert list_ai_drafts(subject="GK").count() == 1
        assert list_ai_drafts(difficulty="hard").count() == 1
        assert list_ai_drafts(language="en").count() == 1
        assert list_ai_drafts(topic="Fractions").count() == 2

    def test_filter_by_user_and_status(self):
        user = UserFactory()
        AIQuestionDraftFactory(created_by=user, status=DraftStatus.GENERATED)
        AIQuestionDraftFactory(created_by=None)
        assert list_ai_drafts(created_by=user).count() == 1
        assert list_ai_drafts(status="generated").count() == 2

    def test_newest_first(self):
        a = AIQuestionDraftFactory()
        b = AIQuestionDraftFactory()
        assert list(list_ai_drafts()) == [b, a]
