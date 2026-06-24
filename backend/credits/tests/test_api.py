from decimal import Decimal

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Role, UserRole
from accounts.tests.factories import UserFactory
from credits.models import CreditLedger
from credits.services import grant_credits
from credits.tests.factories import CreditLedgerFactory

pytestmark = pytest.mark.django_db

D = Decimal


# ── Helpers ──────────────────────────────────────────────────────────────────
def _role(name: str) -> Role:
    role, _ = Role.objects.get_or_create(name=name, defaults={"is_system": True})
    return role


def _auth_client(user) -> APIClient:
    refresh = RefreshToken.for_user(user)
    client = APIClient()
    client.cookies["access_token"] = str(refresh.access_token)
    client.cookies["refresh_token"] = str(refresh)
    client.user = user
    return client


def _ops_client(role_name: str) -> APIClient:
    user = UserFactory(is_email_verified=True, status="active")
    UserRole.objects.create(user=user, role=_role(role_name))
    return _auth_client(user)


# ═══════════════════════════════════════════════════════════════════════════
# User APIs
# ═══════════════════════════════════════════════════════════════════════════
class TestCreditBalanceAPI:
    URL = "/api/v1/credits/balance/"

    def test_requires_authentication(self):
        assert APIClient().get(self.URL).status_code in (401, 403)

    def test_returns_own_summary(self):
        user = UserFactory()
        grant_credits(user=user, amount=D("100.00"))
        resp = _auth_client(user).get(self.URL)
        assert resp.status_code == 200
        assert resp.data == {
            "available": "100.00",
            "reserved": "0.00",
            "lifetime": "100.00",
        }

    def test_zero_when_no_balance(self):
        resp = _auth_client(UserFactory()).get(self.URL)
        assert resp.data["available"] == "0.00"


class TestCreditLedgerAPI:
    URL = "/api/v1/credits/ledger/"

    def test_requires_authentication(self):
        assert APIClient().get(self.URL).status_code in (401, 403)

    def test_lists_only_own_entries(self):
        user = UserFactory()
        CreditLedgerFactory(user=user)
        CreditLedgerFactory(user=UserFactory())  # someone else
        resp = _auth_client(user).get(self.URL)
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 1

    def test_is_cursor_paginated(self):
        user = UserFactory()
        for _ in range(25):
            CreditLedgerFactory(user=user)
        client = _auth_client(user)
        first = client.get(self.URL)
        assert len(first.data["results"]) == 20
        assert first.data["next"] is not None
        second = client.get(first.data["next"])
        assert len(second.data["results"]) == 5


# ═══════════════════════════════════════════════════════════════════════════
# Ops APIs — read
# ═══════════════════════════════════════════════════════════════════════════
class TestOpsUserCreditsAPI:
    def _url(self, uid):
        return f"/api/v1/ops/users/{uid}/credits/"

    def test_returns_balance_and_recent_ledger(self):
        target = UserFactory()
        grant_credits(user=target, amount=D("80.00"))
        resp = _ops_client("support").get(self._url(target.id))
        assert resp.status_code == 200
        assert resp.data["balance"] == "80.00"
        assert resp.data["reserved"] == "0.00"
        assert resp.data["lifetime"] == "80.00"
        assert len(resp.data["recent_ledger"]) == 1

    def test_caps_recent_ledger_at_20(self):
        target = UserFactory()
        for _ in range(25):
            CreditLedgerFactory(user=target)
        resp = _ops_client("platform_admin").get(self._url(target.id))
        assert len(resp.data["recent_ledger"]) == 20

    @pytest.mark.parametrize("role", ["student", "sme", "content_reviewer"])
    def test_forbidden_for_non_ops_roles(self, role):
        target = UserFactory()
        assert _ops_client(role).get(self._url(target.id)).status_code == 403

    def test_unauthenticated_denied(self):
        target = UserFactory()
        assert APIClient().get(self._url(target.id)).status_code in (401, 403)

    def test_unknown_user_404(self):
        import uuid

        assert (
            _ops_client("platform_admin").get(self._url(uuid.uuid4())).status_code
            == 404
        )


# ═══════════════════════════════════════════════════════════════════════════
# Ops APIs — adjust
# ═══════════════════════════════════════════════════════════════════════════
class TestOpsUserCreditsAdjustAPI:
    def _url(self, uid):
        return f"/api/v1/ops/users/{uid}/credits/adjust/"

    def test_positive_adjustment_updates_balance_and_records_actor(self):
        target = UserFactory()
        client = _ops_client("platform_admin")
        resp = client.post(
            self._url(target.id), {"amount": "50.00", "description": "goodwill"}
        )
        assert resp.status_code == 200
        assert resp.data["balance"]["available"] == "50.00"
        entry = CreditLedger.objects.get(user=target)
        assert entry.transaction_type == CreditLedger.ADJUSTMENT
        assert entry.amount == D("50.00")
        assert entry.created_by_id == client.user.id

    def test_negative_adjustment(self):
        target = UserFactory()
        grant_credits(user=target, amount=D("100.00"))
        resp = _ops_client("support").post(self._url(target.id), {"amount": "-30.00"})
        assert resp.status_code == 200
        assert resp.data["balance"]["available"] == "70.00"

    def test_zero_amount_rejected(self):
        target = UserFactory()
        resp = _ops_client("platform_admin").post(
            self._url(target.id), {"amount": "0"}
        )
        assert resp.status_code == 400

    def test_negative_below_zero_rejected(self):
        target = UserFactory()
        resp = _ops_client("platform_admin").post(
            self._url(target.id), {"amount": "-10.00"}
        )
        assert resp.status_code == 400

    def test_forbidden_for_student(self):
        target = UserFactory()
        resp = _ops_client("student").post(self._url(target.id), {"amount": "5"})
        assert resp.status_code == 403

    def test_unknown_user_404(self):
        import uuid

        resp = _ops_client("platform_admin").post(
            self._url(uuid.uuid4()), {"amount": "5"}
        )
        assert resp.status_code == 404
