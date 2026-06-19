import React from 'react';
import { RoleGuard } from '@/lib/rbac/RoleGuard';
import { OnboardingGuard } from '@/lib/rbac/OnboardingGuard';
import { AppShell } from '@/features/nav/AppShell';

/**
 * Student layout (S0-T12).
 *
 * Guarded by the universal Student workspace — every authenticated user has it,
 * so this gate is effectively "require sign-in" while keeping the same
 * RoleGuard + AppShell pattern used by the review and admin groups.
 *
 * OnboardingGuard (S1-T08) sits inside RoleGuard so it only evaluates once the
 * user is authenticated: users with no target exam are redirected to
 * /onboarding before the AppShell chrome renders.
 */
export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard requiredWorkspace="student">
      <OnboardingGuard>
        <AppShell>{children}</AppShell>
      </OnboardingGuard>
    </RoleGuard>
  );
}
