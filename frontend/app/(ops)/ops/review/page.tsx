import React from "react";
import { AppShell } from "@/features/ops/AppShell";
import { WorkspaceHeader } from "@/features/ops/WorkspaceHeader";
import { ReviewQueueWorkspace } from "@/features/ops/review/ReviewQueueWorkspace";

/**
 * Review Queue route — OPS-03 (/ops/review).
 *
 * The Operations reviewer workspace that replaces reviewer Django Admin
 * workflows. Renders inside the Operations Platform shell (OPS-01A). Reviewers
 * claim, release, approve, reject, and escalate questions; the backend enforces
 * the state machine and remains the source of truth. English-only.
 */
export default function ReviewQueueRoute() {
  return (
    <AppShell
      header={
        <WorkspaceHeader
          title="Review Queue"
          subtitle="Claim, review, and move questions through the content pipeline."
          breadcrumbs={[
            { label: "PrepGenius Ops", href: "/ops" },
            { label: "Review Queue" },
          ]}
        />
      }
    >
      <ReviewQueueWorkspace />
    </AppShell>
  );
}
