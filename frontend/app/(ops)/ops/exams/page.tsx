import React from "react";
import { AppShell } from "@/features/ops/AppShell";
import { WorkspaceHeader } from "@/features/ops/WorkspaceHeader";
import { ExamWorkspace } from "@/features/ops/exams/ExamWorkspace";

/**
 * Exam Management route — OPS-05 (/ops/exams).
 *
 * A modern workspace that replaces Django Admin browsing of exams, subjects,
 * topics, subtopics, and previous-year papers. Read-only foundation: browse the
 * configuration, syllabus hierarchy, counts, and relationships. Renders inside
 * the Operations Platform shell (OPS-01A). English-only Operations UI.
 */
export default function ExamManagementRoute() {
  return (
    <AppShell
      header={
        <WorkspaceHeader
          title="Exam Management"
          subtitle="Browse exams, the syllabus hierarchy, and previous-year papers."
          breadcrumbs={[
            { label: "PrepGenius Ops", href: "/ops" },
            { label: "Exam Management" },
          ]}
        />
      }
    >
      <ExamWorkspace />
    </AppShell>
  );
}
