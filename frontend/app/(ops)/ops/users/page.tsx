import React from "react";
import { AppShell } from "@/features/ops/AppShell";
import { WorkspaceHeader } from "@/features/ops/WorkspaceHeader";
import { UserWorkspace } from "@/features/ops/users/UserWorkspace";

/**
 * User 360 route — OPS-06 (/ops/users).
 *
 * Read-only operational workspace for Support, Operations and Super Admin users
 * to investigate (not modify) users. Renders inside the Operations Platform
 * shell (OPS-01A / OPS-HARDEN-02 guard). The backend remains the source of
 * truth; no editing, impersonation, credit/subscription or role actions.
 * English-only.
 */
export default function UsersRoute() {
  return (
    <AppShell
      header={
        <WorkspaceHeader
          title="User 360"
          subtitle="Investigate users — read-only profile, account and learning snapshot."
          breadcrumbs={[
            { label: "PrepGenius Ops", href: "/ops" },
            { label: "User 360" },
          ]}
        />
      }
    >
      <UserWorkspace />
    </AppShell>
  );
}
