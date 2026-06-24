import React from "react";
import { AppShell } from "@/features/ops/AppShell";
import { WorkspaceHeader } from "@/features/ops/WorkspaceHeader";
import { ContentStudioPage } from "@/features/ops/content/ContentStudioPage";

/**
 * Content Studio route — OPS-02 (/ops/content).
 *
 * The first operational workspace that begins retiring Django Admin for content
 * operations. Renders inside the Operations Platform shell (OPS-01A). Management
 * surface only — browse / search / filter / inspect questions (read-only).
 * English-only Operations UI.
 */
export default function ContentStudioRoute() {
  return (
    <AppShell
      header={
        <WorkspaceHeader
          title="Content Studio"
          subtitle="Manage questions, metadata, taxonomy, and publication readiness."
          breadcrumbs={[
            { label: "PrepGenius Ops", href: "/ops" },
            { label: "Content Studio" },
          ]}
        />
      }
    >
      <ContentStudioPage />
    </AppShell>
  );
}
