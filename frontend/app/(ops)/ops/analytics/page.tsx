import React from "react";
import { AppShell } from "@/features/ops/AppShell";
import { WorkspaceHeader } from "@/features/ops/WorkspaceHeader";
import { AnalyticsWorkspace } from "@/features/ops/analytics/AnalyticsWorkspace";

/**
 * Analytics route — OPS-08 (/ops/analytics).
 *
 * Read-only operational visibility built entirely on the existing analytics
 * endpoints (dashboard, readiness, topic-performance). Renders inside the
 * Operations Platform shell + route guard. The backend remains the source of
 * truth; no aggregation or computation happens client-side. English-only.
 */
export default function AnalyticsRoute() {
  return (
    <AppShell
      header={
        <WorkspaceHeader
          title="Analytics"
          subtitle="Operational visibility from existing analytics endpoints."
          breadcrumbs={[
            { label: "PrepGenius Ops", href: "/ops" },
            { label: "Analytics" },
          ]}
        />
      }
    >
      <AnalyticsWorkspace />
    </AppShell>
  );
}
