/**
 * Base API client. Uses httpOnly cookies for auth — no tokens in JS storage.
 * Replace manual fetch calls with the generated typed client once the OpenAPI
 * schema is available from the backend (run: npm run generate-api).
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include", // send httpOnly cookies
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail ?? "API request failed");
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
