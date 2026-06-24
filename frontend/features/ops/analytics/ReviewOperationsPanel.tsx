import React from "react";
import { AnalyticsStateNotice } from "./AnalyticsStateNotice";
import { MetricCard } from "./MetricCard";
import type { AnalyticsPhase, OpsReviewAnalytics } from "./analyticsService";

/**
 * ReviewOperationsPanel — OPS-08A (Part D).
 *
 * Review-pool claim/escalation state and today's decisions from
 * GET /ops/analytics/review/. Read-only metrics rendered verbatim. English-only;
 * semantic tokens.
 */
export function ReviewOperationsPanel({
  data,
  phase,
  onRetry,
}: {
  data: OpsReviewAnalytics | null;
  phase: AnalyticsPhase;
  onRetry?: () => void;
}) {
  return (
    <section aria-label="Review operations" className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Review operations</h2>

      {phase !== "ready" || !data ? (
        <AnalyticsStateNotice
          phase={phase === "ready" ? "loading" : phase}
          onRetry={onRetry}
          loadingLabel="Loading review operations"
          rows={2}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <MetricCard label="Claimed" value={data.claimed} />
          <MetricCard label="Unclaimed" value={data.unclaimed} />
          <MetricCard label="Escalated" value={data.escalated} />
          <MetricCard label="Approved today" value={data.approved_today} />
          <MetricCard label="Rejected today" value={data.rejected_today} />
        </div>
      )}
    </section>
  );
}
