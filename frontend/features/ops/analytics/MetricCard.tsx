import React from "react";

/**
 * MetricCard — OPS-08A shared metric tile.
 *
 * A single labelled, read-only metric rendered verbatim from a backend value.
 * Used by the KPI, Review, and Credit sections so they share one presentation.
 * `mono` right-aligns and monospaces money values for exact decimal display.
 * Semantic tokens only; English-only.
 */
export function MetricCard({
  label,
  value,
  hint,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={
          "mt-1 text-3xl font-semibold tabular-nums text-foreground" +
          (mono ? " font-mono" : "")
        }
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
