import React from "react";
import { AppShell } from "@/features/ops/AppShell";
import { WorkspaceHeader } from "@/features/ops/WorkspaceHeader";
import { CMSWorkspace } from "@/features/ops/cms/CMSWorkspace";

/**
 * CMS Studio route — OPS-04 (/ops/cms).
 *
 * A modern CMS Studio workspace that begins replacing Django Admin for content
 * managers. Read-only foundation: browse pages and guides, inspect metadata, and
 * preview published content. Renders inside the Operations Platform shell
 * (OPS-01A). English-only Operations UI.
 */
export default function CmsStudioRoute() {
  return (
    <AppShell
      header={
        <WorkspaceHeader
          title="CMS Studio"
          subtitle="Browse and preview website pages and study guides."
          breadcrumbs={[
            { label: "PrepGenius Ops", href: "/ops" },
            { label: "CMS Studio" },
          ]}
        />
      }
    >
      <CMSWorkspace />
    </AppShell>
  );
}
