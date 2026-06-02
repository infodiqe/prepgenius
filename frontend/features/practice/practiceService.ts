import { cookies } from "next/headers";
import { paths } from "@/lib/api/types";

export type ExamTree = paths["/api/v1/exams/{id}/tree/"]["get"]["responses"]["200"]["content"]["application/json"];
export type MockTest = paths["/api/v1/attempts/mock-tests/"]["get"]["responses"]["200"]["content"]["application/json"][number];
export type ExamAttempt = paths["/api/v1/attempts/attempts/"]["get"]["responses"]["200"]["content"]["application/json"][number];
export type ExamDetail = paths["/api/v1/exams/{id}/"]["get"]["responses"]["200"]["content"]["application/json"];
export type ExamListEntry = paths["/api/v1/exams/"]["get"]["responses"]["200"]["content"]["application/json"][number];

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

export async function getExamTreeServer(examId: string): Promise<ExamTree | null> {
  try {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}/api/v1/exams/${examId}/tree/`, {
      method: "GET",
      headers,
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Error fetching exam tree:", error);
    return null;
  }
}

export async function getMockTestsServer(examId: string): Promise<MockTest[] | null> {
  try {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}/api/v1/attempts/mock-tests/?exam_id=${examId}`, {
      method: "GET",
      headers,
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Error fetching mock tests:", error);
    return null;
  }
}

export async function listAttemptsServer(examId: string): Promise<ExamAttempt[] | null> {
  try {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}/api/v1/attempts/attempts/?exam_id=${examId}`, {
      method: "GET",
      headers,
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Error fetching attempts:", error);
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

export async function getExamsListServer(): Promise<ExamListEntry[] | null> {
  try {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}/api/v1/exams/`, {
      method: "GET",
      headers,
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Error fetching exams list:", error);
    return null;
  }
}
