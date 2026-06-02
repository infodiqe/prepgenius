import { cookies } from "next/headers";
import { paths } from "@/lib/api/types";

export type AttemptResult = paths["/api/v1/attempts/attempts/{id}/results/"]["get"]["responses"]["200"]["content"]["application/json"];
export type AttemptAnalytics = paths["/api/v1/attempts/attempts/{id}/analytics/"]["get"]["responses"]["200"]["content"]["application/json"];
export type AttemptDetail = paths["/api/v1/attempts/attempts/{id}/"]["get"]["responses"]["200"]["content"]["application/json"];
export type ExamDetail = paths["/api/v1/exams/{id}/"]["get"]["responses"]["200"]["content"]["application/json"];
export type PublishedQuestion = paths["/api/v1/questions/published/"]["get"]["responses"]["200"]["content"]["application/json"][number];

const API_URL = process.env.API_URL ?? "http://django:8000";

async function getHeaders() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;

  return {
    "Content-Type": "application/json",
    Cookie: `access_token=${accessToken || ""}; refresh_token=${refreshToken || ""}`,
  };
}

export async function getAttemptResultsServer(attemptId: string): Promise<AttemptResult | null> {
  try {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}/api/v1/attempts/attempts/${attemptId}/results/`, {
      method: "GET",
      headers,
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Error fetching attempt results:", error);
    return null;
  }
}

export async function getAttemptAnalyticsServer(attemptId: string): Promise<AttemptAnalytics | null> {
  try {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}/api/v1/attempts/attempts/${attemptId}/analytics/`, {
      method: "GET",
      headers,
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Error fetching attempt analytics:", error);
    return null;
  }
}

export async function getAttemptDetailServer(attemptId: string): Promise<AttemptDetail | null> {
  try {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}/api/v1/attempts/attempts/${attemptId}/`, {
      method: "GET",
      headers,
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Error fetching attempt detail:", error);
    return null;
  }
}

export async function getExamDetailsServer(examId: string): Promise<ExamDetail | null> {
  try {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}/api/v1/exams/${examId}/`, {
      method: "GET",
      headers,
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Error fetching exam details:", error);
    return null;
  }
}

export async function getPublishedQuestionsServer(examId: string): Promise<PublishedQuestion[] | null> {
  try {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}/api/v1/questions/published/?exam_id=${examId}`, {
      method: "GET",
      headers,
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Error fetching published questions:", error);
    return null;
  }
}
