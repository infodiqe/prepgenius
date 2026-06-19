import React from 'react';
import { RoleGuard } from '@/lib/rbac/RoleGuard';
import { AppShell } from '@/features/nav/AppShell';

/**
 * Review layout (S0-T12) — requires Review workspace access (content_reviewer,
 * sme, content_manager or platform_admin). Reuses the generalized AppShell.
 * Actual review screens are built in a later sprint (S2).
 */
export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard requiredWorkspace="review">
      <AppShell>{children}</AppShell>
    </RoleGuard>
  );
}
