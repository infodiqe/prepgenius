"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { hasOpsAccess } from "./opsAccess";

/**
 * OpsRouteGuard — Operations Platform route-group gate (OPS-HARDEN-02 Part A).
 *
 * Follows the exact pattern of `lib/rbac/RoleGuard` (useAuth + redirect), but
 * authorizes against Ops access derived from the user's RBAC **roles**
 * (`hasOpsAccess`, `opsAccess.ts`) rather than a student-app `Workspace`. The Ops
 * Platform is a distinct route group, not one of the student workspaces
 * (student/review/admin), so it does not belong in that union — but the gating
 * behaviour and permission source are shared (no custom auth, no duplicated
 * permission logic; the role→persona mapping lives only in `opsAccess.ts`).
 *
 * Redirects safely:
 *   - not authenticated            → /login
 *   - authenticated, no Ops access → /dashboard (universal Student landing)
 *
 * Until the user is confirmed authorized, `fallback` (default: nothing) renders —
 * the protected Ops chrome is never shown to an unauthorized user.
 *
 * This is presentation/UX gating only. Real data authorization is enforced
 * server-side by the backend API (RBAC + tenant isolation); no backend changes.
 */
export function OpsRouteGuard({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const isAuthenticated = !!user;
  const isAllowed = user ? hasOpsAccess(user.roles) : false;

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
    } else if (!isAllowed) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, isAllowed, router]);

  if (isLoading || !isAuthenticated || !isAllowed) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
