import React from 'react';
import { RoleGuard } from '@/lib/rbac/RoleGuard';
import { AppShell } from '@/features/nav/AppShell';

/**
 * Admin layout (S0-T12) — requires Admin workspace access (content_manager or
 * platform_admin). Reuses the generalized AppShell. Actual admin screens are
 * built in a later sprint (S4).
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard requiredWorkspace="admin">
      <AppShell>{children}</AppShell>
    </RoleGuard>
  );
}
