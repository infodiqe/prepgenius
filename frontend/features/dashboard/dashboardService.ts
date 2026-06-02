import { apiRequest } from "@/lib/api/client";
import { paths } from "@/lib/api/types";
import { cookies } from "next/headers";

export type DashboardData = paths["/api/v1/dashboard/"]["get"]["responses"]["200"]["content"]["application/json"];

export async function getDashboard(examId?: string) {
  const query = examId ? `?exam_id=${encodeURIComponent(examId)}` : "";
  return apiRequest<DashboardData>(`/dashboard/${query}`, {
    method: "GET",
  });
}

export async function getDashboardServer(examId?: string): Promise<DashboardData | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;

  if (!accessToken) return null;

  const API_URL = process.env.API_URL ?? "http://django:8000";
  const query = examId ? `?exam_id=${encodeURIComponent(examId)}` : "";

  try {
    const response = await fetch(`${API_URL}/api/v1/dashboard/${query}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Cookie: `access_token=${accessToken}; refresh_token=${refreshToken || ""}`,
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch dashboard data on server:", error);
    return null;
  }
}
