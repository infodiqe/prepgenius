import { cookies } from "next/headers";
import { paths } from "@/lib/api/types";

export type ScoredAttempt = paths["/api/v1/attempts/attempts/"]["get"]["responses"]["200"]["content"]["application/json"][number];

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

export async function listUserAttemptsServer(examId: string): Promise<ScoredAttempt[] | null> {
  try {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}/api/v1/attempts/attempts/?exam_id=${examId}&status=scored`, {
      method: "GET",
      headers,
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Error listing user scored attempts:", error);
    return null;
  }
}
