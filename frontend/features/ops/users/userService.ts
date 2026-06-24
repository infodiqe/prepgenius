import { apiRequest } from "@/lib/api/client";
import type { components } from "@/lib/api/types";
import { listExams, type ContentExam } from "../content/contentService";

/*
 * User 360 — client data access (OPS-06A).
 *
 * READ-ONLY. Consumes ONLY the OPS-BE-01 operational user endpoints; the backend
 * is the source of truth. No business logic, no client-side filtering, search,
 * pagination or derivation, no mutations.
 *
 *   GET /ops/users/                → paginated, searchable, filterable user list
 *   GET /ops/users/{id}/           → full user profile (reuses the profile shape)
 *   GET /ops/users/{id}/summary/   → operational summary (attempts/streak/readiness)
 *   GET /exams/                    → target-exam options for the filter dropdown
 *
 * The new ops endpoints are not yet in the generated OpenAPI client types
 * (regenerating it is a backend/tooling step, out of scope here), so their
 * response shapes are typed locally below. The detail endpoint reuses the
 * backend's `UserProfileSerializer`, so it maps to the generated `UserProfile`.
 */

/** Full user record from GET /ops/users/{id}/ (profile serializer shape). */
export type OpsUser = components["schemas"]["UserProfile"];

/** Account status union (mirrors the backend UserProfileStatusEnum). */
export type OpsUserStatus = components["schemas"]["UserProfileStatusEnum"];

export type { ContentExam };

/** Minimal exam reference nested in list rows / latest attempt. */
export interface OpsExamRef {
  id: string;
  code: string;
  name: string;
}

/** One row of GET /ops/users/ (API 1). */
export interface OpsUserListItem {
  id: string;
  full_name: string;
  email: string;
  roles: string[];
  status: OpsUserStatus;
  target_exam: OpsExamRef | null;
  created_at: string;
}

/** Latest attempt summary nested in GET /ops/users/{id}/summary/. */
export interface OpsLatestAttempt {
  id: string;
  exam: OpsExamRef;
  attempt_type: string;
  status: string;
  total_questions: number;
  score: string | null;
  accuracy: string | null;
  created_at: string;
  submitted_at: string | null;
}

/** GET /ops/users/{id}/summary/ (API 3). */
export interface OpsUserSummary {
  total_attempts: number;
  latest_attempt: OpsLatestAttempt | null;
  readiness_score: string | null;
  current_streak: number;
}

/** DRF cursor-paginated envelope. */
interface CursorPage<T> {
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Server-side list params (all optional; empty values are omitted). */
export interface OpsUserListParams {
  search?: string;
  role?: string;
  status?: string;
  target_exam?: string;
  /** Opaque cursor token (from a previous page's next/prev), never computed. */
  cursor?: string;
}

/** A page of users plus the opaque cursor tokens for prev/next (server-driven). */
export interface OpsUserPage {
  results: OpsUserListItem[];
  nextCursor: string | null;
  prevCursor: string | null;
}

// ── Reads ──────────────────────────────────────────────────────────────────

/**
 * Extract the opaque `cursor` token from a DRF next/previous URL. We re-issue it
 * as a query param on the same relative endpoint rather than fetching the
 * absolute URL (which carries the backend host). The token is used verbatim —
 * no page math.
 */
function extractCursor(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url, "http://placeholder.invalid").searchParams.get("cursor");
  } catch {
    return null;
  }
}

/** GET /ops/users/ — one page (server pagination/search/filtering only). */
export async function listOpsUsers(
  params: OpsUserListParams = {},
): Promise<OpsUserPage> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.role) qs.set("role", params.role);
  if (params.status) qs.set("status", params.status);
  if (params.target_exam) qs.set("target_exam", params.target_exam);
  if (params.cursor) qs.set("cursor", params.cursor);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  const page = await apiRequest<CursorPage<OpsUserListItem>>(
    `/ops/users/${suffix}`,
  );
  return {
    results: page.results,
    nextCursor: extractCursor(page.next),
    prevCursor: extractCursor(page.previous),
  };
}

/** GET /ops/users/{id}/ — full profile. */
export function getOpsUser(id: string): Promise<OpsUser> {
  return apiRequest<OpsUser>(`/ops/users/${id}/`);
}

/** GET /ops/users/{id}/summary/ — operational summary. */
export function getOpsUserSummary(id: string): Promise<OpsUserSummary> {
  return apiRequest<OpsUserSummary>(`/ops/users/${id}/summary/`);
}

export { listExams };

// ── Display helpers (pure — no business logic, no derivation) ────────────────

/** A user's display name, falling back to the email, then the id. */
export function userDisplayName(user: {
  full_name?: string | null;
  email?: string;
  id: string;
}): string {
  if (user.full_name?.trim()) return user.full_name.trim();
  if (user.email) return user.email;
  return user.id;
}

/** Comma-joined role labels, or "—" when a user has no roles. */
export function rolesLabel(roles: readonly string[]): string {
  return roles.length > 0 ? roles.join(", ") : "—";
}

/** Format an ISO date / date-time as en-GB, or "—" when absent/invalid. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Normalize a server readiness decimal string ("66.00") for display ("66"), or
 * null when absent. Presentation only — the value is computed server-side.
 */
export function formatReadiness(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return String(n);
}
