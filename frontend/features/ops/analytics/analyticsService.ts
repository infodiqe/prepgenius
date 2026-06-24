import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/errors";

/*
 * Analytics Workspace — client data access (OPS-08 → OPS-08A).
 *
 * READ-ONLY. Consumes ONLY the operator analytics endpoints (OPS-BE-03); the
 * backend is the source of truth. This module performs NO business logic, NO
 * aggregation, NO derivation, NO client-side filtering — it fetches typed
 * payloads for display. The endpoints are platform-wide (operator scope) and take
 * no parameters.
 *
 *   GET /ops/analytics/overview/    → platform KPI snapshot
 *   GET /ops/analytics/readiness/   → readiness band distribution
 *   GET /ops/analytics/content/     → question counts by review state
 *   GET /ops/analytics/credits/     → ledger movement + active wallets
 *   GET /ops/analytics/review/      → review-pool + decision metrics
 *
 * DRF serializes DecimalField to STRINGS ("100.00") — money values are typed as
 * `string` and rendered verbatim (exact), never parsed for client-side math.
 */

// ── Shared request phase ─────────────────────────────────────────────────────

export type AnalyticsPhase =
  | "loading"
  | "ready"
  | "error"
  | "unauthorized"
  | "forbidden";

/** Map a thrown error to a non-ready phase (RBAC-aware; server is authoritative). */
export function classifyError(
  err: unknown,
): Extract<AnalyticsPhase, "error" | "unauthorized" | "forbidden"> {
  if (err instanceof ApiError && err.status === 403) return "forbidden";
  if (err instanceof ApiError && err.status === 401) return "unauthorized";
  return "error";
}

// ── Response shapes (mirror the OPS-BE-03 serializers) ───────────────────────

/** GET /ops/analytics/overview/. Money fields are exact decimal strings. */
export interface OpsOverview {
  total_users: number;
  active_users_30d: number;
  total_attempts: number;
  total_questions: number;
  approved_questions: number;
  published_pages: number;
  available_credits: string;
  reserved_credits: string;
}

export interface ReadinessBand {
  label: string;
  count: number;
}

/** GET /ops/analytics/readiness/. */
export interface OpsReadinessDistribution {
  bands: ReadinessBand[];
  total: number;
}

/** GET /ops/analytics/content/. */
export interface OpsContentDistribution {
  draft: number;
  in_review: number;
  sme_review: number;
  approved: number;
  published: number;
}

/** GET /ops/analytics/review/. */
export interface OpsReviewAnalytics {
  claimed: number;
  unclaimed: number;
  escalated: number;
  approved_today: number;
  rejected_today: number;
}

/** GET /ops/analytics/credits/. Money fields are exact decimal strings. */
export interface OpsCreditAnalytics {
  total_granted: string;
  total_reserved: string;
  total_debited: string;
  active_wallets: number;
}

// ── Reads (operator-wide; no parameters) ─────────────────────────────────────

export function getOpsOverview(): Promise<OpsOverview> {
  return apiRequest<OpsOverview>(`/ops/analytics/overview/`);
}

export function getOpsReadiness(): Promise<OpsReadinessDistribution> {
  return apiRequest<OpsReadinessDistribution>(`/ops/analytics/readiness/`);
}

export function getOpsContent(): Promise<OpsContentDistribution> {
  return apiRequest<OpsContentDistribution>(`/ops/analytics/content/`);
}

export function getOpsReview(): Promise<OpsReviewAnalytics> {
  return apiRequest<OpsReviewAnalytics>(`/ops/analytics/review/`);
}

export function getOpsCredits(): Promise<OpsCreditAnalytics> {
  return apiRequest<OpsCreditAnalytics>(`/ops/analytics/credits/`);
}
