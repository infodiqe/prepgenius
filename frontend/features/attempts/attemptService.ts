import { apiRequest } from "@/lib/api/client";
import { paths } from "@/lib/api/types";

export type ExamAttempt = paths["/api/v1/attempts/attempts/{id}/"]["get"]["responses"]["200"]["content"]["application/json"];
export type AttemptResults = paths["/api/v1/attempts/attempts/{id}/results/"]["get"]["responses"]["200"]["content"]["application/json"];
export type AttemptAnalytics = paths["/api/v1/attempts/attempts/{id}/analytics/"]["get"]["responses"]["200"]["content"]["application/json"];

export async function getAttemptDetails(id: string) {
  return apiRequest<ExamAttempt>(`/attempts/attempts/${id}/`, {
    method: "GET",
  });
}

export async function getAttemptResults(id: string) {
  return apiRequest<AttemptResults>(`/attempts/attempts/${id}/results/`, {
    method: "GET",
  });
}

export async function getAttemptAnalytics(id: string) {
  return apiRequest<AttemptAnalytics>(`/attempts/attempts/${id}/analytics/`, {
    method: "GET",
  });
}

export async function startAttempt(id: string) {
  return apiRequest<ExamAttempt>(`/attempts/attempts/${id}/start/`, {
    method: "POST",
  });
}

export async function submitAttempt(id: string) {
  return apiRequest<ExamAttempt>(`/attempts/attempts/${id}/submit/`, {
    method: "POST",
  });
}

export async function saveAnswer(attemptId: string, data: paths["/api/v1/attempts/attempts/{attempt_pk}/answers/save/"]["post"]["requestBody"]["content"]["application/json"]) {
  return apiRequest<paths["/api/v1/attempts/attempts/{attempt_pk}/answers/save/"]["post"]["responses"]["200"]["content"]["application/json"]>(
    `/attempts/attempts/${attemptId}/answers/save/`,
    {
      method: "POST",
      body: data,
    }
  );
}

export async function createAttempt(data: paths["/api/v1/attempts/attempts/"]["post"]["requestBody"]["content"]["application/json"]) {
  return apiRequest<paths["/api/v1/attempts/attempts/"]["post"]["responses"]["201"]["content"]["application/json"]>(
    "/attempts/attempts/",
    {
      method: "POST",
      body: data,
    }
  );
}

// T28 — server-authoritative practice. Topic/Subject/Mixed practice creates a
// custom MockTest server-side and returns a normal attempt (same response shape
// as createAttempt). Endpoint not yet in the generated client; typed inline.
export type PracticeScopeType = "topic" | "subject" | "mixed";

export interface CreatePracticeAttemptRequest {
  exam_id: string;
  scope_type: PracticeScopeType;
  scope_id?: string | null;
}

export async function createPracticeAttempt(data: CreatePracticeAttemptRequest) {
  // The attempts app is mounted at `attempts/` in config/api_router.py, and its
  // in-app URLConf prefixes routes with `attempts/` too — so the real path is
  // doubled (`/attempts/attempts/...`), matching every other attempt endpoint
  // above (createAttempt, startAttempt, etc.). The inner segment is required;
  // omitting it resolves to a non-existent route and 404s. (SPRINT-5A-02)
  return apiRequest<paths["/api/v1/attempts/attempts/"]["post"]["responses"]["201"]["content"]["application/json"]>(
    "/attempts/attempts/practice/",
    {
      method: "POST",
      body: data,
    }
  );
}
