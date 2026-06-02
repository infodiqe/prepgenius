import { cookies } from "next/headers";
import { paths } from "@/lib/api/types";

export type AttemptDetail = paths["/api/v1/attempts/attempts/{id}/"]["get"]["responses"]["200"]["content"]["application/json"];

const API_URL = process.env.API_URL ?? "http://django:8000";

async function getAuthHeaders() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;
  return {
    "Content-Type": "application/json",
    Cookie: `access_token=${accessToken ?? ""}; refresh_token=${refreshToken ?? ""}`,
  };
}

export async function getAttemptDetailServer(attemptId: string): Promise<AttemptDetail | null> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/api/v1/attempts/attempts/${attemptId}/`, {
      method: "GET",
      headers,
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
