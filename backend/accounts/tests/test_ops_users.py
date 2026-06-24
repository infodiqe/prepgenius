"""
OPS-BE-01 — Operations User 360 backend API tests.

Covers selectors, serializers, permission/RBAC, and the three read-only APIs
(list + pagination + search + filters, detail, summary). All external state is
built from factories; no live services.
"""
from decimal import Decimal
from unittest.mock import MagicMock

import pytest
from django.contrib.auth.models import AnonymousUser
from rest_framework.test import APIClient, APIRequestFactory
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Role, UserRole
from accounts.permissions import IsOpsUserViewer
from accounts.api.ops_serializers import (
    OpsUserListSerializer,
    OpsUserSummarySerializer,
)
from accounts.selectors.ops_user_selectors import (
    get_ops_user,
    get_ops_user_summary,
    list_ops_users,
)
from accounts.tests.factories import ExamFactory, UserFactory
from attempts.tests.factories import ExamAttemptFactory
from analytics.tests.factories import ExamReadinessScoreFactory

pytestmark = pytest.mark.django_db

LIST_URL = "/api/v1/ops/users/"


# ── Helpers ──────────────────────────────────────────────────────────────────
def _role(name: str) -> Role:
    role, _ = Role.objects.get_or_create(name=name, defaults={"is_system": True})
    return role


def _user_with_role(role_name: str, **kwargs):
    user = UserFactory(is_email_verified=True, status="active", **kwargs)
    UserRole.objects.create(user=user, role=_role(role_name))
    return user


def _client_for(role_name: str) -> APIClient:
    user = _user_with_role(role_name)
    refresh = RefreshToken.for_user(user)
    client = APIClient()
    client.cookies["access_token"] = str(refresh.access_token)
    client.cookies["refresh_token"] = str(refresh)
    client.user = user
    return client


def _request_with(user):
    request = APIRequestFactory().get("/")
    request.user = user
    return request


# ═══════════════════════════════════════════════════════════════════════════
# Selectors
# ═══════════════════════════════════════════════════════════════════════════
class TestListOpsUsersSelector:
    def test_returns_all_users(self):
        UserFactory.create_batch(3)
        assert list_ops_users().count() == 3

    def test_search_matches_name(self):
        UserFactory(full_name="Amla Bora", email="a@x.com")
        UserFactory(full_name="Rahim Ali", email="r@x.com")
        results = list_ops_users(search="amla")
        assert [u.full_name for u in results] == ["Amla Bora"]

    def test_search_matches_email(self):
        UserFactory(full_name="Amla Bora", email="amla@unique.com")
        UserFactory(full_name="Rahim Ali", email="rahim@other.com")
        results = list_ops_users(search="unique")
        assert [u.email for u in results] == ["amla@unique.com"]

    def test_filter_by_role(self):
        target = _user_with_role("support")
        _user_with_role("student")
        results = list_ops_users(role="support")
        assert [u.id for u in results] == [target.id]

    def test_filter_by_status(self):
        active = UserFactory(status="active")
        UserFactory(status="suspended")
        results = list_ops_users(status="active")
        assert [u.id for u in results] == [active.id]

    def test_filter_by_target_exam(self):
        exam = ExamFactory()
        matched = UserFactory(target_exam=exam)
        UserFactory(target_exam=ExamFactory())
        results = list_ops_users(target_exam=exam.id)
        assert [u.id for u in results] == [matched.id]


class TestGetOpsUserSelector:
    def test_returns_user(self):
        user = UserFactory()
        assert get_ops_user(user_id=user.id).id == user.id

    def test_missing_user_raises_http404(self):
        import uuid

        from django.http import Http404

        with pytest.raises(Http404):
            get_ops_user(user_id=uuid.uuid4())


class TestGetOpsUserSummarySelector:
    def test_counts_attempts_and_picks_latest(self):
        user = UserFactory()
        ExamAttemptFactory(user=user)
        latest = ExamAttemptFactory(user=user)
        summary = get_ops_user_summary(user=user)
        assert summary["total_attempts"] == 2
        assert summary["latest_attempt"].id == latest.id
        assert isinstance(summary["current_streak"], int)

    def test_readiness_from_target_exam_when_available(self):
        exam = ExamFactory()
        user = UserFactory(target_exam=exam)
        ExamReadinessScoreFactory(user=user, exam=exam, score=Decimal("82.50"))
        summary = get_ops_user_summary(user=user)
        assert summary["readiness_score"] == Decimal("82.50")

    def test_empty_summary_has_no_attempts_or_readiness(self):
        user = UserFactory()  # no target exam, no attempts
        summary = get_ops_user_summary(user=user)
        assert summary["total_attempts"] == 0
        assert summary["latest_attempt"] is None
        assert summary["readiness_score"] is None


# ═══════════════════════════════════════════════════════════════════════════
# Serializers
# ═══════════════════════════════════════════════════════════════════════════
class TestOpsUserListSerializer:
    def test_serializes_seven_fields_with_roles_and_exam(self):
        exam = ExamFactory(code="CTET", name="CTET Paper I")
        user = _user_with_role("support", target_exam=exam)
        data = OpsUserListSerializer(get_ops_user(user_id=user.id)).data
        assert set(data) == {
            "id",
            "full_name",
            "email",
            "roles",
            "status",
            "target_exam",
            "created_at",
        }
        assert data["roles"] == ["support"]
        assert data["target_exam"]["code"] == "CTET"
        assert data["target_exam"]["name"] == "CTET Paper I"

    def test_target_exam_null_when_absent(self):
        user = UserFactory()
        data = OpsUserListSerializer(user).data
        assert data["target_exam"] is None
        assert data["roles"] == []


class TestOpsUserSummarySerializer:
    def test_serializes_null_latest_attempt(self):
        data = OpsUserSummarySerializer(
            {
                "total_attempts": 0,
                "latest_attempt": None,
                "readiness_score": None,
                "current_streak": 0,
            }
        ).data
        assert data["latest_attempt"] is None
        assert data["readiness_score"] is None
        assert data["total_attempts"] == 0

    def test_serializes_latest_attempt_and_readiness(self):
        user = UserFactory()
        attempt = ExamAttemptFactory(user=user)
        data = OpsUserSummarySerializer(
            {
                "total_attempts": 1,
                "latest_attempt": attempt,
                "readiness_score": Decimal("70.00"),
                "current_streak": 3,
            }
        ).data
        assert data["latest_attempt"]["id"] == str(attempt.id)
        assert data["latest_attempt"]["exam"]["code"] == attempt.exam.code
        assert data["readiness_score"] == "70.00"
        assert data["current_streak"] == 3


# ═══════════════════════════════════════════════════════════════════════════
# Permission (unit) + RBAC
# ═══════════════════════════════════════════════════════════════════════════
class TestIsOpsUserViewerPermission:
    @pytest.mark.parametrize(
        "role_name",
        ["platform_admin", "content_manager", "support", "operations"],
    )
    def test_allows_each_operational_role(self, role_name):
        user = _user_with_role(role_name)
        assert (
            IsOpsUserViewer().has_permission(_request_with(user), MagicMock())
            is True
        )

    @pytest.mark.parametrize("role_name", ["student", "sme", "content_reviewer"])
    def test_denies_non_operational_roles(self, role_name):
        user = _user_with_role(role_name)
        assert (
            IsOpsUserViewer().has_permission(_request_with(user), MagicMock())
            is False
        )

    def test_denies_unauthenticated(self):
        assert (
            IsOpsUserViewer().has_permission(
                _request_with(AnonymousUser()), MagicMock()
            )
            is False
        )


# ═══════════════════════════════════════════════════════════════════════════
# API 1 — list / pagination / search / filters / RBAC
# ═══════════════════════════════════════════════════════════════════════════
class TestOpsUsersListAPI:
    def test_authorized_role_gets_200(self):
        client = _client_for("support")
        resp = client.get(LIST_URL)
        assert resp.status_code == 200
        assert "results" in resp.data

    @pytest.mark.parametrize("role_name", ["student", "sme", "content_reviewer"])
    def test_forbidden_for_non_operational_roles(self, role_name):
        client = _client_for(role_name)
        assert client.get(LIST_URL).status_code == 403

    def test_unauthenticated_is_denied(self):
        assert APIClient().get(LIST_URL).status_code in (401, 403)

    def test_is_paginated(self):
        client = _client_for("platform_admin")  # +1 user (the requester)
        UserFactory.create_batch(25)
        from accounts.models import User

        total = User.objects.count()

        first = client.get(LIST_URL)
        assert first.status_code == 200
        assert len(first.data["results"]) == 20
        assert first.data["next"] is not None

        second = client.get(first.data["next"])
        assert second.status_code == 200
        assert len(second.data["results"]) == total - 20

    def test_row_shape(self):
        exam = ExamFactory(code="SSC", name="SSC CGL")
        _user_with_role("support", target_exam=exam, full_name="Findme User")
        client = _client_for("platform_admin")
        resp = client.get(LIST_URL, {"search": "Findme"})
        assert resp.status_code == 200
        row = resp.data["results"][0]
        assert set(row) == {
            "id",
            "full_name",
            "email",
            "roles",
            "status",
            "target_exam",
            "created_at",
        }
        assert row["target_exam"]["code"] == "SSC"

    def test_search_filters_server_side(self):
        UserFactory(full_name="Zarina Begum", email="zarina@x.com")
        UserFactory(full_name="Other Person", email="other@x.com")
        client = _client_for("support")
        resp = client.get(LIST_URL, {"search": "zarina"})
        names = [r["full_name"] for r in resp.data["results"]]
        assert names == ["Zarina Begum"]

    def test_filter_by_status(self):
        UserFactory(status="suspended", full_name="Susp Ended")
        client = _client_for("support")  # requester is active
        resp = client.get(LIST_URL, {"status": "suspended"})
        statuses = {r["status"] for r in resp.data["results"]}
        assert statuses == {"suspended"}

    def test_filter_by_role(self):
        _user_with_role("teacher")
        client = _client_for("platform_admin")
        resp = client.get(LIST_URL, {"role": "teacher"})
        roles = [r["roles"] for r in resp.data["results"]]
        assert roles == [["teacher"]]

    def test_filter_by_target_exam(self):
        exam = ExamFactory()
        UserFactory(target_exam=exam, full_name="Targeted")
        UserFactory(target_exam=ExamFactory())
        client = _client_for("support")
        resp = client.get(LIST_URL, {"target_exam": str(exam.id)})
        names = [r["full_name"] for r in resp.data["results"]]
        assert names == ["Targeted"]

    def test_invalid_status_is_rejected(self):
        client = _client_for("support")
        assert client.get(LIST_URL, {"status": "bogus"}).status_code == 400


# ═══════════════════════════════════════════════════════════════════════════
# API 2 — detail
# ═══════════════════════════════════════════════════════════════════════════
class TestOpsUserDetailAPI:
    def _url(self, user_id):
        return f"/api/v1/ops/users/{user_id}/"

    def test_returns_profile_shape(self):
        exam = ExamFactory()
        target = _user_with_role("student", target_exam=exam)
        client = _client_for("support")
        resp = client.get(self._url(target.id))
        assert resp.status_code == 200
        assert resp.data["id"] == str(target.id)
        assert resp.data["email"] == target.email
        assert resp.data["roles"] == ["student"]
        assert str(resp.data["target_exam_id"]) == str(exam.id)
        assert resp.data["status"] == "active"

    def test_unknown_user_is_404(self):
        import uuid

        client = _client_for("platform_admin")
        assert client.get(self._url(uuid.uuid4())).status_code == 404

    def test_forbidden_for_student(self):
        target = UserFactory()
        client = _client_for("student")
        assert client.get(self._url(target.id)).status_code == 403


# ═══════════════════════════════════════════════════════════════════════════
# API 3 — summary
# ═══════════════════════════════════════════════════════════════════════════
class TestOpsUserSummaryAPI:
    def _url(self, user_id):
        return f"/api/v1/ops/users/{user_id}/summary/"

    def test_returns_summary_fields(self):
        exam = ExamFactory()
        target = UserFactory(target_exam=exam)
        ExamAttemptFactory(user=target)
        ExamReadinessScoreFactory(user=target, exam=exam, score=Decimal("66.00"))
        client = _client_for("operations")
        resp = client.get(self._url(target.id))
        assert resp.status_code == 200
        assert resp.data["total_attempts"] == 1
        assert resp.data["latest_attempt"] is not None
        assert resp.data["readiness_score"] == "66.00"
        assert "current_streak" in resp.data

    def test_empty_summary(self):
        target = UserFactory()
        client = _client_for("support")
        resp = client.get(self._url(target.id))
        assert resp.status_code == 200
        assert resp.data["total_attempts"] == 0
        assert resp.data["latest_attempt"] is None
        assert resp.data["readiness_score"] is None

    def test_unknown_user_is_404(self):
        import uuid

        client = _client_for("platform_admin")
        assert client.get(self._url(uuid.uuid4())).status_code == 404

    def test_forbidden_for_student(self):
        target = UserFactory()
        client = _client_for("student")
        assert client.get(self._url(target.id)).status_code == 403
