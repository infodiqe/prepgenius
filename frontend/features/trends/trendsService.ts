import { apiRequest } from "@/lib/api/client";

/*
 * Trend & Progress — client data access (Sprint 4 · T27).
 *
 * Client-safe. Consumes ONLY the existing T24 endpoints as the source of truth;
 * computes nothing (no trends/forecasts/derived metrics). Typed locally because
 * the OpenAPI client has not been regenerated for the analytics endpoints —
 * values are rendered verbatim.
 *   GET /analytics/trends/attempts/?exam_id=
 *   GET /analytics/trends/sections/?exam_id=&scope=subject|topic
 *   GET /analytics/trends/readiness/?exam_id=
 */

export interface AttemptTrendPoint {
  attempt_id: string;
  created_at: string;
  score: string | null;
  max_score: string | null;
  accuracy: string | null;
}

export interface SectionHistoryPoint {
  attempt_id: string;
  created_at: string;
  accuracy: string | null;
}

export interface SectionTrend {
  scope_id: string;
  scope_name: string;
  history: SectionHistoryPoint[];
}

export interface ReadinessTrendPoint {
  score: string | null;
  band: string | null;
  computed_at: string;
  components: Record<string, unknown>;
}

export type SectionScope = "subject" | "topic";

export function getAttemptTrend(examId: string) {
  return apiRequest<AttemptTrendPoint[]>(
    `/analytics/trends/attempts/?exam_id=${encodeURIComponent(examId)}`,
  );
}

export function getSectionTrend(examId: string, scope: SectionScope) {
  return apiRequest<SectionTrend[]>(
    `/analytics/trends/sections/?exam_id=${encodeURIComponent(examId)}&scope=${scope}`,
  );
}

export function getReadinessTrend(examId: string) {
  return apiRequest<ReadinessTrendPoint[]>(
    `/analytics/trends/readiness/?exam_id=${encodeURIComponent(examId)}`,
  );
}
