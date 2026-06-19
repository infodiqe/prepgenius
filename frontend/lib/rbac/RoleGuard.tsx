"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Workspace } from "@/lib/workspace/cookies";
import { useAuth } from "@/features/auth/AuthContext";
import { deriveWorkspaces } from "@/lib/rbac/workspaces";

/**
 * RoleGuard — route-group access gate (Sprint 0 · S0-T12).
 *
 * Authorizes access to a workspace's routes from the user's **roles**
 * (`deriveWorkspaces`, S0-T02) — never from the selected/active workspace. This
 * is why selecting a workspace can never grant authorization (AC4): the guard
 * does not consult `useWorkspace()` at all.
 *
 * Redirects safely:
 *   - not authenticated  → /login
 *   - lacks the required workspace → /dashboard (the Student workspace is
 *     universal, so it is always a safe landing for any authenticated user)
 *
 * Until the user is confirmed authorized, the `fallback` (default: nothing) is
 * rendered — the protected children/chrome are never shown to an unauthorized
 * user.
 *
 * This is presentation/UX gating. Real data authorization is enforced
 * server-side by the backend API (RBAC); there are no backend changes here.
 */
export function RoleGuard({
  requiredWorkspace,
  children,
  fallback = null,
}: {
  requiredWorkspace: Workspace;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const isAuthenticated = !!user;
  const isAllowed = user
    ? deriveWorkspaces(user.roles).includes(requiredWorkspace)
    : false;

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
