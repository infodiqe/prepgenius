import { apiRequest } from "@/lib/api/client";

/*
 * Topic Mastery — client data access (Sprint 4 · T26).
 *
 * Client-safe. Consumes ONLY the existing T23 endpoint as the source of truth;
 * computes nothing. Typed locally because the OpenAPI client has not been
 * regenerated for the analytics endpoints — values are rendered verbatim.
 *   GET /api/v1/analytics/topic-performance/?exam_id=
 */

export interface TopicPerformance {
  topic_id: string;
  topic_name: string;
  attempts: number;
  correct: number;
  success_rate: string | null;
  avg_time: string | null;
  last_practiced_at: string | null;
}

export function getTopicPerformance(examId: string) {
  return apiRequest<TopicPerformance[]>(
    `/analytics/topic-performance/?exam_id=${encodeURIComponent(examId)}`,
  );
}
