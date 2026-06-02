import { cookies } from "next/headers";
import { paths } from "@/lib/api/types";

type UserProfile = paths["/api/v1/auth/profile/"]["get"]["responses"]["200"]["content"]["application/json"];

export async function getCurrentUser(): Promise<UserProfile | null> {
  const cookieStore = await cookies();
  const accessCookie = cookieStore.get("access_token")?.value;
  const refreshCookie = cookieStore.get("refresh_token")?.value;

  if (!accessCookie) {
    return null;
  }

  const API_URL = process.env.API_URL ?? "http://django:8000";

  try {
    // Call the profile endpoint internally passing the cookied request header
    const response = await fetch(`${API_URL}/api/v1/auth/profile/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Cookie: `access_token=${accessCookie}; refresh_token=${refreshCookie || ""}`,
      },
      next: { revalidate: 0 }, // do not cache on server
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch user profile on server:", error);
    return null;
  }
}
