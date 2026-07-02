/**
 * Base API client. Uses httpOnly cookies for auth — no tokens in JS storage.
 *
 * Automatic session refresh (RC-02A): the access token lives 15 minutes. When
 * an authenticated request returns 401 (expired access cookie), the client
 * transparently calls the backend refresh endpoint once, then retries the
 * original request exactly once. A single in-flight refresh is shared across
 * all concurrent 401s. If refresh fails the session is unrecoverable, so we
 * redirect to /login preserving the destination via ?next=. The backend remains
 * authoritative — refresh mints/sets the new httpOnly cookies; nothing is read
 * or written from JS storage. Server-side navigations are refreshed in
 * middleware (this client only covers client-component calls).
 */

import { ApiError } from "@/lib/errors";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1";
const REFRESH_PATH = "/auth/token/refresh/";

/**
 * Session-lifecycle endpoints where a 401 is NOT an expired-access-token signal
 * (bad credentials, pre-auth flows, or the refresh call itself). These never
 * trigger an auto-refresh or redirect — the caller surfaces the error inline.
 */
const NO_REFRESH_PATHS = [
  "/auth/login/",
  "/auth/register/",
  "/auth/token/refresh/",
  "/auth/verify-email/",
  "/auth/resend-verification/",
  "/auth/password/reset/",
  "/auth/password/confirm/",
];

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  /**
   * When a refresh ultimately fails, redirect to /login?next=… (default true).
   * The session probe (getProfile on app mount) sets this false: a 401 there
   * simply means "not signed in", which must not bounce public-page visitors
   * to /login.
   */
  skipAuthRedirect?: boolean;
}

// Single-flight refresh: only one refresh request is ever in flight. All
// concurrent 401s await the same promise, then retry their own original
// request. The slot is cleared once the refresh settles.
let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE}${REFRESH_PATH}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  if (pathname.startsWith("/login")) return; // already there — avoid a loop
  const next = encodeURIComponent(`${pathname}${search}`);
  window.location.assign(`/login?next=${next}`);
}

async function throwApiError(response: Response): Promise<never> {
  const payload = await response
    .json()
    .catch(() => ({ detail: response.statusText }));
  const detail =
    payload && typeof payload === "object" && typeof payload.detail === "string"
      ? payload.detail
      : undefined;
  throw new ApiError(response.status, payload, detail);
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, headers = {}, skipAuthRedirect = false } = options;

  const send = () =>
    fetch(`${API_BASE}${path}`, {
      method,
      credentials: "include", // send httpOnly cookies
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });

  let response = await send();

  // Expired-access-token recovery: refresh once (single-flight) and retry the
  // original request exactly once. Never refresh a second time — that bounds
  // the flow and prevents infinite refresh loops.
  if (response.status === 401 && !NO_REFRESH_PATHS.includes(path)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await send();
    }
    if (!refreshed || response.status === 401) {
      if (!skipAuthRedirect) redirectToLogin();
      return throwApiError(response);
    }
  }

  if (!response.ok) {
    // Surface the structured error to the T02 framework: ApiError carries the
    // HTTP status + parsed payload (DRF field errors) that normalizeError needs,
    // while `message` (the DRF `detail`, if any) keeps legacy `e.message` callers
    // working since ApiError extends Error.
    return throwApiError(response);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
