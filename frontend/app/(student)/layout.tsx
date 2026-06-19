import React from 'react';
import { RoleGuard } from '@/lib/rbac/RoleGuard';
import { AppShell } from '@/features/nav/AppShell';

/**
 * Student layout (S0-T12).
 *
 * Guarded by the universal Student workspace — every authenticated user has it,
 * so this gate is effectively "require sign-in" while keeping the same
 * RoleGuard + AppShell pattern used by the review and admin groups.
 */
export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard requiredWorkspace="student">
      <AppShell>{children}</AppShell>
    </RoleGuard>
  );
}
