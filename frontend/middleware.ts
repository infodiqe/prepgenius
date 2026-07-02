import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Route prefixes that require authentication.
// Note (SPRINT-5B-02): "/content" is a PUBLIC CMS page (authed tooling is under
// "/ops"); "/mocks"/"/contentops" are obsolete prefixes — all kept out.
const protectedPaths = [
  "/dashboard",
  "/practice",
  "/tutor",
  "/profile",
  "/review",
  "/ops",
  "/admin",
];

const authPages = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";
const REFRESH_ENDPOINT = "/api/v1/auth/token/refresh/";

function matchesPrefix(pathname: string, paths: string[]): boolean {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function loginRedirect(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "next",
    request.nextUrl.pathname + request.nextUrl.search,
  );
  return NextResponse.redirect(loginUrl);
}

/**
 * Server-side access-token refresh for full-page navigations (server
 * components, browser refresh, deep links) — RC-02A.
 *
 * The access cookie's max-age equals the 15-minute token lifetime, so an
 * expired session presents as: access cookie ABSENT, refresh cookie PRESENT.
 * We mint a fresh access token via the cookie-authenticated backend refresh
 * endpoint, forward it to the current SSR render (so this navigation renders
 * with a valid token — no redirect bounce), and relay the backend's Set-Cookie
 * headers to the browser verbatim (preserving HttpOnly/Secure/SameSite/Max-Age).
 *
 * Returns a response to use, or null if refresh failed (caller → /login).
 * Loop-safe: this runs once per navigation and never redirects to itself.
 */
async function refreshForNavigation(
  request: NextRequest,
  refreshToken: string,
): Promise<NextResponse | null> {
  const apiUrl = process.env.API_URL ?? "http://django:8000";

  let backendRes: Response;
  try {
    backendRes = await fetch(`${apiUrl}${REFRESH_ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${REFRESH_COOKIE}=${refreshToken}`,
      },
    });
  } catch {
    return null; // backend unreachable — treat as refresh failure
  }

  if (!backendRes.ok) return null;

  const setCookies = backendRes.headers.getSetCookie();
  if (!setCookies || setCookies.length === 0) return null;

  // Pull the refreshed token values out of the Set-Cookie headers so we can
  // forward them to the current render.
  const refreshed: Record<string, string> = {};
  for (const cookie of setCookies) {
    const pair = cookie.split(";", 1)[0] ?? "";
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    const name = pair.slice(0, eq).trim();
    if (name === ACCESS_COOKIE || name === REFRESH_COOKIE) {
      refreshed[name] = pair.slice(eq + 1).trim();
    }
  }
  if (!refreshed[ACCESS_COOKIE]) return null;

  // Forward the fresh cookies to the downstream server render. Preserve every
  // other cookie (theme, locale, …) and override only the auth tokens.
  const cookieJar = new Map(
    request.cookies.getAll().map((c) => [c.name, c.value]),
  );
  for (const [name, value] of Object.entries(refreshed)) {
    cookieJar.set(name, value);
  }
  const cookieHeader = Array.from(cookieJar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("cookie", cookieHeader);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  // Relay the backend's Set-Cookie headers verbatim so the browser stores the
  // refreshed session with the backend's exact cookie attributes.
  for (const cookie of setCookies) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;

  if (matchesPrefix(pathname, protectedPaths)) {
    if (!accessToken) {
      // No (or expired/dropped) access cookie. If a refresh cookie is present,
      // try to refresh server-side so the navigation renders without a bounce.
      const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
      if (refreshToken) {
        const refreshed = await refreshForNavigation(request, refreshToken);
        if (refreshed) return refreshed;
      }
      // No refresh token, or refresh failed → send to login (preserve target).
      return loginRedirect(request);
    }
    return NextResponse.next();
  }

  // Redirect already-authenticated users away from auth pages.
  if (matchesPrefix(pathname, authPages) && accessToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
