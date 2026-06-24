import React from "react";
import { AppShell } from "@/features/ops/AppShell";
import { WorkspaceHeader } from "@/features/ops/WorkspaceHeader";
import { BillingWorkspace } from "@/features/ops/billing/BillingWorkspace";

/**
 * Billing & Credits route — OPS-07 (/ops/billing).
 *
 * Operational workspace for managing learner credit balances and auditing usage
 * history, built entirely on the existing OPS-BE-02 credits APIs (+ OPS-BE-01
 * user lookup). Renders inside the Operations Platform shell + route guard. The
 * backend remains the source of truth. English-only.
 */
export default function BillingRoute() {
  return (
    <AppShell
      header={
        <WorkspaceHeader
          title="Billing & Credits"
          subtitle="Manage learner credit balances and audit usage history."
          breadcrumbs={[
            { label: "PrepGenius Ops", href: "/ops" },
            { label: "Billing & Credits" },
          ]}
        />
      }
    >
      <BillingWorkspace />
    </AppShell>
  );
}
