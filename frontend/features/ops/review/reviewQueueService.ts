import { ApiError } from "@/lib/errors";
import type {
  ContentQuestion,
  ContentReviewStatus,
} from "../content/contentService";

/*
 * Review Queue — client data access (OPS-03).
 *
 * Consumes ONLY existing content-review / questions endpoints; the backend
 * enforces the review state machine + RBAC and remains the source of truth.
 * This module performs NO client-side workflow logic: every action POSTs to the
 * server, whose response decides legality, after which the caller RE-FETCHES
 * (no optimistic state).
 *
 *   POST /questions/{id}/claim/         { question_id }   → claim
 *   POST /questions/{id}/release-claim/ { question_id }   → release
 *   POST /questions/{id}/approve/       { comment }       → reviewer approve
 *   POST /questions/{id}/sme-approve/   { comment }       → SME approve
 *   POST /questions/{id}/request-sme/   { comment }       → escalate
 *   POST /questions/{id}/reject/        { comment }       → reject
 *
 * Reads (list by status, exams, exam tree, label indexes) are shared from
 * `../content/contentService` — no duplication.
 *
 * KNOWN BACKEND LIMITATIONS (documented gaps, surfaced in the UI as "Awaiting
 * backend support"): the question list payload does not expose `claimed_by`, so
 * "My Queue" / "Unclaimed" (claim-ownership) columns cannot be served; and the
 * list endpoint has no date filter, so "Approved/Rejected Today" show all
 * approved/rejected (date scope awaiting backend support).
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1";

/**
 * POST a workflow action. The endpoints return an empty `200` on success, so we
 * do NOT parse a JSON body (unlike `apiRequest`); only failures are parsed for
 * their error payload. Auth via httpOnly cookies.
 */
async function postAction(path: string, body: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = await res
      .json()
      .catch(() => ({ detail: res.statusText }));
    const detail =
      payload && typeof payload === "object" && typeof payload.detail === "string"
        ? payload.detail
        : undefined;
    throw new ApiError(res.status, payload, detail);
  }
}

// ── Workflow actions (server-authoritative) ───────────────────────────────

export function claimQuestion(id: string) {
  return postAction(`/questions/${id}/claim/`, { question_id: id });
}

export function releaseQuestion(id: string) {
  return postAction(`/questions/${id}/release-claim/`, { question_id: id });
}

export function rejectQuestion(id: string, comment: string) {
  return postAction(`/questions/${id}/reject/`, { comment });
}

/** Escalate to SME review (in_review → sme_review). */
export function escalateQuestion(id: string, comment: string) {
  return postAction(`/questions/${id}/request-sme/`, { comment });
}

/**
 * Approve at the level the question's current status calls for: an `sme_review`
 * question is approved via the SME endpoint, otherwise the reviewer endpoint.
 * This only routes to the correct existing endpoint — authority and transition
 * legality are enforced by the backend (a reviewer hitting the SME endpoint is
 * rejected with 403).
 */
export function approveQuestion(
  id: string,
  status: ContentReviewStatus,
  comment: string,
) {
  const path =
    status === "sme_review"
      ? `/questions/${id}/sme-approve/`
      : `/questions/${id}/approve/`;
  return postAction(path, { comment });
}

// ── Board column definitions ──────────────────────────────────────────────

export type ReviewColumnKey =
  | "my_queue"
  | "unclaimed"
  | "in_review"
  | "sme_review"
  | "approved_today"
  | "rejected_today";

export interface ReviewColumnDef {
  key: ReviewColumnKey;
  title: string;
  /** Server review_status this column fetches, when supported. */
  reviewStatus?: ContentReviewStatus;
  /** True when the column cannot be served by the current API. */
  awaiting?: boolean;
  /** Explanatory note (documented gap) shown under the column header. */
  note?: string;
}

/**
 * The six OPS-03 columns mapped to what the API can serve. Claim-ownership
 * columns are "awaiting" (no `claimed_by` in the payload); the "Today" columns
 * are served by status with a date-scope note (no date filter param).
 */
export const REVIEW_COLUMNS: readonly ReviewColumnDef[] = [
  {
    key: "my_queue",
    title: "My Queue",
    awaiting: true,
    note: "Claim ownership is not exposed by the API.",
  },
  {
    key: "unclaimed",
    title: "Unclaimed",
    awaiting: true,
    note: "Claim ownership is not exposed by the API.",
  },
  { key: "in_review", title: "In Review", reviewStatus: "in_review" },
  { key: "sme_review", title: "SME Review", reviewStatus: "sme_review" },
  {
    key: "approved_today",
    title: "Approved Today",
    reviewStatus: "approved",
    note: "Date filter awaiting backend support — showing all approved.",
  },
  {
    key: "rejected_today",
    title: "Rejected Today",
    reviewStatus: "rejected",
    note: "Date filter awaiting backend support — showing all rejected.",
  },
];

export type { ContentQuestion, ContentReviewStatus };
