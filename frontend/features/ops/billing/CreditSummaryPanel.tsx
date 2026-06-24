import React from "react";
import { Skeleton } from "@/components/ui";
import type { OpsUserCredits } from "./billingService";

/**
 * CreditSummaryPanel — OPS-07 (Part A).
 *
 * Top-of-workspace KPI cards for the selected user: Available, Reserved and
 * Lifetime credits. Values come verbatim from GET /ops/users/{id}/credits/ —
 * no client-side credit math. There is no platform-aggregate credits endpoint,
 * so these totals reflect the selected user (dashes before one is chosen).
 * Semantic tokens only; English-only.
 */
const ZERO_DASH = "—";

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

export function CreditSummaryPanel({
  credits,
  loading = false,
}: {
  credits: OpsUserCredits | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading credit summary"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <section
      aria-label="Credit summary"
      className="grid grid-cols-1 gap-4 sm:grid-cols-3"
    >
      <Kpi label="Available Credits" value={credits ? credits.balance : ZERO_DASH} />
      <Kpi label="Reserved Credits" value={credits ? credits.reserved : ZERO_DASH} />
      <Kpi label="Lifetime Credits" value={credits ? credits.lifetime : ZERO_DASH} />
    </section>
  );
}
