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
