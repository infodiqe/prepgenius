import React from "react";
import { AnalyticsStateNotice } from "./AnalyticsStateNotice";
import { MetricCard } from "./MetricCard";
import type { AnalyticsPhase, OpsOverview } from "./analyticsService";

/**
 * AnalyticsKpiCards — OPS-08A (Part A).
 *
 * Platform overview KPIs rendered VERBATIM from GET /ops/analytics/overview/ —
 * no client computation, no aggregation. Money values are exact decimal strings.
 * Loading / error / unauthorized / forbidden are handled via the shared notice.
 * English-only; semantic tokens.
 */
export function AnalyticsKpiCards({
  overview,
  phase,
  onRetry,
}: {
  overview: OpsOverview | null;
  phase: AnalyticsPhase;
  onRetry?: () => void;
}) {
  return (
    <section aria-label="Key metrics" className="space-y-2">
      {phase !== "ready" || !overview ? (
        <AnalyticsStateNotice
          phase={phase === "ready" ? "loading" : phase}
          onRetry={onRetry}
          loadingLabel="Loading overview"
          rows={2}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total users" value={overview.total_users} />
          <MetricCard
            label="Active users"
            value={overview.active_users_30d}
            hint="last 30 days"
          />
          <MetricCard label="Total attempts" value={overview.total_attempts} />
          <MetricCard label="Total questions" value={overview.total_questions} />
          <MetricCard
            label="Approved questions"
            value={overview.approved_questions}
          />
          <MetricCard label="Published pages" value={overview.published_pages} />
          <MetricCard
            label="Available credits"
            value={overview.available_credits}
            mono
          />
          <MetricCard
            label="Reserved credits"
            value={overview.reserved_credits}
            mono
          />
        </div>
      )}
    </section>
  );
}
