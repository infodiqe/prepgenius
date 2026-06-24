import React from "react";
import { Skeleton } from "@/components/ui";
import { AwaitingBackendNote } from "../content/AwaitingBackendNote";
import {
  formatDate,
  formatReadiness,
  type OpsUserSummary,
} from "./userService";

/**
 * UserAnalyticsPanel — OPS-06A (Section 3, Learning Snapshot).
 *
 * READ-ONLY view of GET /ops/users/{id}/summary/ (OPS-BE-01): total attempts,
 * latest attempt, current streak, and readiness score. Every value is rendered
 * verbatim from the server — NO client-side calculation. Readiness shows
 * "No readiness data" when the API returns null. Semantic tokens only;
 * English-only.
 */
export type AnalyticsPhase = "loading" | "error" | "ready";

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function UserAnalyticsPanel({
  phase,
  summary,
}: {
  phase: AnalyticsPhase;
  summary: OpsUserSummary | null;
}) {
  if (phase === "loading") {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading learning snapshot"
        className="grid grid-cols-2 gap-3"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (phase === "error" || !summary) {
    return (
      <AwaitingBackendNote>
        Learning summary could not be loaded.
      </AwaitingBackendNote>
    );
  }

  const readiness = formatReadiness(summary.readiness_score);
  const latest = summary.latest_attempt;

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatTile label="Total attempts" value={summary.total_attempts} />
      <StatTile
        label="Current streak"
        value={summary.current_streak}
        hint="days"
      />
      <StatTile
        label="Latest attempt"
        value={latest ? latest.exam.name : "None"}
        hint={latest ? formatDate(latest.created_at) : undefined}
      />
      <StatTile
        label="Readiness"
        value={
          readiness ?? (
            <span className="text-sm font-normal text-muted-foreground">
              No readiness data
            </span>
          )
        }
      />
    </div>
  );
}
