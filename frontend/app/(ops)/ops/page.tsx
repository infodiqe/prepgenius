import React from "react";
import { AppShell } from "@/features/ops/AppShell";
import { WorkspaceHeader } from "@/features/ops/WorkspaceHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

/**
 * Ops Platform overview (placeholder) — OPS-01A.
 *
 * Proves the shell renders end-to-end: AppShell chrome + WorkspaceHeader + KPI
 * and queue placeholder cards. No business logic, no backend calls — the real
 * dashboard widgets land in a later ticket. The Operations Platform UI is
 * English-only (no i18n).
 */
const KPIS = [
  { id: "users", label: "Active users" },
  { id: "spend", label: "AI spend vs budget" },
  { id: "backlog", label: "Pipeline backlog" },
  { id: "jobs", label: "Failed jobs" },
] as const;

const QUEUES = [
  { id: "review", label: "Review Queue" },
  { id: "sme", label: "SME Review" },
  { id: "jobs", label: "Job failures" },
] as const;

const PLACEHOLDER = "Coming soon";

export default function OpsOverviewPage() {
  return (
    <AppShell
      header={
        <WorkspaceHeader
          title="Operations overview"
          subtitle="What needs you, and how the platform is doing."
          breadcrumbs={[
            { label: "PrepGenius Ops", href: "/ops" },
            { label: "Overview" },
          ]}
        />
      }
    >
      {/* KPI placeholder cards */}
      <section aria-label="Key metrics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {KPIS.map((kpi) => (
            <Card key={kpi.id}>
              <CardHeader className="pb-2">
                <CardDescription>{kpi.label}</CardDescription>
                <CardTitle className="text-3xl">—</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{PLACEHOLDER}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Queue placeholder cards */}
      <section aria-label="Work queues" className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Work queues
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {QUEUES.map((queue) => (
            <Card key={queue.id}>
              <CardHeader>
                <CardTitle className="text-base">{queue.label}</CardTitle>
                <CardDescription>{PLACEHOLDER}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
                  {PLACEHOLDER}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
