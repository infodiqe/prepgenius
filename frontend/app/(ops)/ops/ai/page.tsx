import React from "react";
import { AppShell } from "@/features/ops/AppShell";
import { WorkspaceHeader } from "@/features/ops/WorkspaceHeader";
import { AiOperationsWorkspace } from "@/features/ops/ai/AiOperationsWorkspace";

/**
 * AI Operations route — Sprint-6A-07 (/ops/ai).
 *
 * Operator workspace for AI-generated question drafts: monitor generation jobs,
 * browse/preview drafts, and import them into the EXISTING Question review
 * pipeline or discard them. Read + two lifecycle actions only — no editing, no
 * authoring, no publish, no AI-specific review workflow. RBAC is enforced by the
 * backend (content_manager / platform_admin); the shell is guarded by
 * OpsRouteGuard. English-only.
 */
export default function AiOperationsRoute() {
  return (
    <AppShell
      header={
        <WorkspaceHeader
          title="AI Operations"
          subtitle="Monitor generation jobs, preview AI drafts, and import them into review."
          breadcrumbs={[
            { label: "PrepGenius Ops", href: "/ops" },
            { label: "AI Operations" },
          ]}
        />
      }
    >
      <AiOperationsWorkspace />
    </AppShell>
  );
}
