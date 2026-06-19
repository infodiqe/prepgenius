"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";

/**
 * OnboardingGuard — onboarding-completion gate (Sprint 1 · T08).
 *
 * Mirrors {@link RoleGuard} (S0-T12) in style and placement: a client-side
 * presentation gate that reads the SSR-hydrated profile from `useAuth()` and
 * redirects users who have not finished onboarding into the onboarding flow.
 *
 * Business rule:
 *   authenticated  AND  user.target_exam_id === null  AND  not on /onboarding
 *     → redirect to /onboarding
 *   otherwise → render children
 *
 * Why a client guard (the S0-T12 lesson): middleware only sees cookie presence,
 * never profile fields, so a profile-dependent decision must run where the
 * hydrated profile is available. The profile is already hydrated into
 * AuthContext on the server (root layout → `initialUser`), so this guard needs
 * no extra fetch and produces no loading flash in the normal case.
 *
 * Loop safety: the `/onboarding` path is exempt (`pathname` check), so a user
 * who still has no target exam is never bounced off the onboarding page itself.
 *
 * Scope: this gate does not own the unauthenticated case — it defers that to the
 * surrounding {@link RoleGuard}, which redirects to /login. No backend changes.
 */

const ONBOARDING_PATH = "/onboarding";

export function OnboardingGuard({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthenticated = !!user;
  // Rule keys strictly on `target_exam_id === null` (the field is always
  // present in the profile contract; null means "no exam chosen yet").
  const needsOnboarding = !!user && user.target_exam_id === null;
  const onOnboarding = (pathname ?? "").startsWith(ONBOARDING_PATH);

  // Only this guard's own redirect condition; the unauthenticated and loading
  // cases are intentionally left to RoleGuard.
  const shouldRedirect =
    !isLoading && isAuthenticated && needsOnboarding && !onOnboarding;

  useEffect(() => {
    if (shouldRedirect) {
      router.replace(ONBOARDING_PATH);
    }
  }, [shouldRedirect, router]);

  // Hide children while a redirect is pending so the dashboard chrome never
  // flashes for a user who has not completed onboarding.
  if (shouldRedirect) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
