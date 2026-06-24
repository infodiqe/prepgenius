import React from "react";
import { AnalyticsStateNotice } from "./AnalyticsStateNotice";
import type {
  AnalyticsPhase,
  OpsReadinessDistribution,
} from "./analyticsService";

/**
 * ReadinessDistributionPanel — OPS-08A (Part B).
 *
 * Cross-learner readiness distribution from GET /ops/analytics/readiness/,
 * rendered as an accessible table (no chart library, no client aggregation — the
 * bands and counts come straight from the backend). English-only; semantic
 * tokens.
 */
export function ReadinessDistributionPanel({
  data,
  phase,
  onRetry,
}: {
  data: OpsReadinessDistribution | null;
  phase: AnalyticsPhase;
  onRetry?: () => void;
}) {
  return (
    <section
      aria-label="Readiness distribution"
      className="space-y-3 rounded-lg border border-border bg-card p-4"
    >
      <h2 className="text-sm font-semibold text-foreground">
        Readiness distribution
      </h2>

      {phase !== "ready" || !data ? (
        <AnalyticsStateNotice
          phase={phase === "ready" ? "loading" : phase}
          onRetry={onRetry}
          loadingLabel="Loading readiness distribution"
          rows={2}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">
                Readiness band distribution across learners
              </caption>
              <thead className="bg-muted/50">
                <tr>
                  <th
                    scope="col"
                    className="px-3 py-2 text-left font-medium text-muted-foreground"
                  >
                    Readiness band
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-right font-medium text-muted-foreground"
                  >
                    Learners
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.bands.map((band) => (
                  <tr key={band.label} className="border-t border-border">
                    <th
                      scope="row"
                      className="px-3 py-2 text-left font-normal text-foreground"
                    >
                      {band.label}
                    </th>
                    <td className="px-3 py-2 text-right tabular-nums text-foreground">
                      {band.count}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-muted/30">
                  <th
                    scope="row"
                    className="px-3 py-2 text-left font-medium text-foreground"
                  >
                    Total
                  </th>
                  <td className="px-3 py-2 text-right font-medium tabular-nums text-foreground">
                    {data.total}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          {data.total === 0 && (
            <p className="text-xs text-muted-foreground">
              No readiness scores have been computed yet.
            </p>
          )}
        </>
      )}
    </section>
  );
}
