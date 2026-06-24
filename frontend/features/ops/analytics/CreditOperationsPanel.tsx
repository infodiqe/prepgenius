import React from "react";
import { AnalyticsStateNotice } from "./AnalyticsStateNotice";
import { MetricCard } from "./MetricCard";
import type { AnalyticsPhase, OpsCreditAnalytics } from "./analyticsService";

/**
 * CreditOperationsPanel — OPS-08A (Part E).
 *
 * Cumulative credit ledger movement and active wallet count from
 * GET /ops/analytics/credits/. Money values are exact decimal strings rendered
 * verbatim (NUMERIC, never float; no client math). English-only; semantic tokens.
 */
export function CreditOperationsPanel({
  data,
  phase,
  onRetry,
}: {
  data: OpsCreditAnalytics | null;
  phase: AnalyticsPhase;
  onRetry?: () => void;
}) {
  return (
    <section aria-label="Credit operations" className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Credit operations</h2>

      {phase !== "ready" || !data ? (
        <AnalyticsStateNotice
          phase={phase === "ready" ? "loading" : phase}
          onRetry={onRetry}
          loadingLabel="Loading credit operations"
          rows={2}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label="Total granted" value={data.total_granted} mono />
          <MetricCard label="Total reserved" value={data.total_reserved} mono />
          <MetricCard label="Total debited" value={data.total_debited} mono />
          <MetricCard label="Active wallets" value={data.active_wallets} />
        </div>
      )}
    </section>
  );
}
