import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define route prefixes that require authentication
const protectedPaths = [
  "/dashboard",
  "/practice",
  "/mocks",
  "/tutor",
  "/profile",
  "/review",
  "/admin",
  "/content",
  "/contentops",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if target path starts with any protected path prefix
  const isProtected = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isProtected) {
    const accessToken = request.cookies.get("access_token")?.value;

    if (!accessToken) {
      // Redirect to login page and preserve the redirect path
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect authenticated users trying to access login/register/forgot-password/reset-password/verify-email
  const isAuthPage = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
  ].some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (isAuthPage) {
    const accessToken = request.cookies.get("access_token")?.value;
    if (accessToken) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
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
