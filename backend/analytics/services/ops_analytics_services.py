"""
Operations analytics services — OPS-BE-03 (read orchestration).

Each function composes the read-only ops selectors into one endpoint payload.
No queries live here (they belong to the selectors) and no business logic lives
in the views — this is the orchestration seam between them. Read-only: nothing
here mutates state.
"""
from analytics.selectors.ops_analytics_selectors import (
    count_active_users,
    count_active_wallets,
    count_published_pages,
    count_questions_by_status,
    count_total_attempts,
    count_total_questions,
    count_total_users,
    credit_ledger_totals,
    readiness_distribution,
    review_ops_counts,
    sum_credit_balances,
)


def get_ops_overview() -> dict:
    """API 1 — cross-domain platform health snapshot."""
    questions = count_questions_by_status()
    balances = sum_credit_balances()
    return {
        "total_users": count_total_users(),
        "active_users_30d": count_active_users(),
        "total_attempts": count_total_attempts(),
        "total_questions": count_total_questions(),
        "approved_questions": questions["approved"],
        "published_pages": count_published_pages(),
        "available_credits": balances["available"],
        "reserved_credits": balances["reserved"],
    }


def get_ops_readiness_distribution() -> dict:
    """API 2 — readiness band distribution (+ total) across learners."""
    bands = readiness_distribution()
    return {"bands": bands, "total": sum(band["count"] for band in bands)}


def get_ops_content_distribution() -> dict:
    """API 3 — question counts by review state."""
    return count_questions_by_status()


def get_ops_review_analytics() -> dict:
    """API 4 — review-pool claim/escalation state + today's decisions."""
    return review_ops_counts()


def get_ops_credit_analytics() -> dict:
    """API 5 — cumulative ledger movement + active wallet count."""
    return {**credit_ledger_totals(), "active_wallets": count_active_wallets()}
