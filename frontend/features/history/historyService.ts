import { apiRequest } from "@/lib/api/client";
import type { paths, components } from "@/lib/api/types";

/*
 * Assessment History & Insights — client data access (Sprint 4 · T21).
 *
 * Client-safe (no next/headers). Consumes ONLY existing analytics endpoints as
 * the source of truth; computes nothing.
 *   - GET /attempts/attempts/?exam_id=&status=scored → scored assessment list (Section A)
 *   - GET /dashboard/?exam_id=                        → weak topics + recommendations + recent activity (C, D)
 * Per-attempt deep dive (Section B) reuses @/features/attempts/attemptService
 * (getAttemptResults + getAttemptAnalytics).
 */

export type ScoredAttempt =
  paths["/api/v1/attempts/attempts/"]["get"]["responses"]["200"]["content"]["application/json"][number];
export type Dashboard = components["schemas"]["Dashboard"];
export type WeakTopic = components["schemas"]["WeakTopic"];
export type Recommendation = components["schemas"]["Recommendation"];
export type RecentActivity = components["schemas"]["RecentActivity"];

/** All scored attempts for an exam (most recent first, per backend ordering). */
export function listScoredAttempts(examId: string) {
  return apiRequest<ScoredAttempt[]>(
    `/attempts/attempts/?exam_id=${encodeURIComponent(examId)}&status=scored`,
  );
}

/** Dashboard rollup (weak topics, recommendations, recent activity). */
export function getHistoryDashboard(examId: string) {
  return apiRequest<Dashboard>(
    `/dashboard/?exam_id=${encodeURIComponent(examId)}`,
  );
}
