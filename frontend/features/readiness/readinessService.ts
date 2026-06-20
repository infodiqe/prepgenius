import { apiRequest } from "@/lib/api/client";
import type { components } from "@/lib/api/types";

/*
 * Readiness dashboard — client data access (Sprint 4 · T20).
 *
 * Client-safe (no next/headers): consumes ONLY existing analytics endpoints as
 * the source of truth. No analytics is computed here — the backend is
 * authoritative.
 *   - GET /dashboard/?exam_id=…            → overall accuracy, weak topics, recommendations
 *   - GET /attempts/attempts/{id}/analytics/ → per-attempt subject/topic breakdown
 */

export type Dashboard = components["schemas"]["Dashboard"];
export type WeakTopic = components["schemas"]["WeakTopic"];
export type Recommendation = components["schemas"]["Recommendation"];
export type RecentActivity = components["schemas"]["RecentActivity"];
export type AttemptAnalytics = components["schemas"]["AttemptAnalytics"];
export type SubjectAnalytic = components["schemas"]["AttemptSectionAnalyticItem"];

/*
 * Readiness response (T25). Typed locally because the OpenAPI client has not
 * been regenerated for the T22 endpoint; the backend remains the source of
 * truth and we render its values verbatim. Mirrors ReadinessSerializer.
 */
export type ReadinessStatus = "scored" | "provisional";

export interface ReadinessComponents {
  status?: string;
  band?: string;
  weights?: Record<string, number>;
  scores?: Record<string, number>;
  exam_type_attempts?: number;
  has_active_severity_3_weak_topic?: boolean;
  exam_ready_threshold?: number;
  topics_practised?: number;
  topics_total?: number;
  streak_days?: number;
}

export interface Readiness {
  status: ReadinessStatus;
  score: string | null;
  band: string | null;
  components: ReadinessComponents;
  computed_at: string | null;
}

/** Dashboard rollup for an exam (weak topics, recommendations, recent activity). */
export function getReadinessDashboard(examId: string) {
  return apiRequest<Dashboard>(
    `/dashboard/?exam_id=${encodeURIComponent(examId)}`,
  );
}

/** Latest exam readiness (T22 engine). Backend returns a provisional status
 * when there is no scored exam-type attempt yet. */
export function getReadiness(examId: string) {
  return apiRequest<Readiness>(
    `/analytics/readiness/?exam_id=${encodeURIComponent(examId)}`,
  );
}

/** Subject/topic breakdown for a single scored attempt. */
export function getAttemptSubjectAnalytics(attemptId: string) {
  return apiRequest<AttemptAnalytics>(
    `/attempts/attempts/${attemptId}/analytics/`,
  );
}
