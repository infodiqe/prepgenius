import React from "react";
import { AnalyticsStateNotice } from "./AnalyticsStateNotice";
import type {
  AnalyticsPhase,
  OpsContentDistribution,
} from "./analyticsService";

/**
 * ContentPipelinePanel — OPS-08A (Part C).
 *
 * Question counts by review state from GET /ops/analytics/content/, rendered as
 * an accessible read-only table. Replaces the OPS-08 QuestionQuality "awaiting
 * backend support" placeholder — these counts are now backed by an API. No
 * derivation. English-only; semantic tokens.
 */
const STAGES: ReadonlyArray<{ key: keyof OpsContentDistribution; label: string }> = [
  { key: "draft", label: "Draft" },
  { key: "in_review", label: "In Review" },
  { key: "sme_review", label: "SME Review" },
  { key: "approved", label: "Approved" },
  { key: "published", label: "Published" },
];

export function ContentPipelinePanel({
  data,
  phase,
  onRetry,
}: {
  data: OpsContentDistribution | null;
  phase: AnalyticsPhase;
  onRetry?: () => void;
}) {
  return (
    <section
      aria-label="Content pipeline"
      className="space-y-3 rounded-lg border border-border bg-card p-4"
    >
      <h2 className="text-sm font-semibold text-foreground">Content pipeline</h2>

      {phase !== "ready" || !data ? (
        <AnalyticsStateNotice
          phase={phase === "ready" ? "loading" : phase}
          onRetry={onRetry}
          loadingLabel="Loading content pipeline"
          rows={2}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Question counts by review state</caption>
            <thead className="bg-muted/50">
              <tr>
                <th
                  scope="col"
                  className="px-3 py-2 text-left font-medium text-muted-foreground"
                >
                  Stage
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right font-medium text-muted-foreground"
                >
                  Questions
                </th>
              </tr>
            </thead>
            <tbody>
              {STAGES.map((stage) => (
                <tr key={stage.key} className="border-t border-border">
                  <th
                    scope="row"
                    className="px-3 py-2 text-left font-normal text-foreground"
                  >
                    {stage.label}
                  </th>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground">
                    {data[stage.key]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
