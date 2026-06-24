import React from "react";
import { formatDate, type OpsUserCredits } from "./billingService";

/**
 * CreditBalanceCard — OPS-07 (Part C).
 *
 * Read-only credit balance for the selected user: Available, Reserved, Lifetime
 * and Last Updated. All values are surfaced from GET /ops/users/{id}/credits/.
 * The credits API has no `updated_at` field, so "Last updated" is the timestamp
 * of the most recent ledger entry (the newest-first first row), or "—" when the
 * user has no ledger history. Semantic tokens only; English-only.
 */
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm font-medium tabular-nums text-foreground">
        {value}
      </dd>
    </div>
  );
}

export function CreditBalanceCard({ credits }: { credits: OpsUserCredits }) {
  const lastUpdated = credits.recent_ledger[0]?.created_at;
  return (
    <section
      aria-label="Credit balance"
      className="rounded-lg border border-border bg-card p-4"
    >
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Credit balance
      </h3>
      <dl className="divide-y divide-border">
        <Row label="Available Credits" value={credits.balance} />
        <Row label="Reserved Credits" value={credits.reserved} />
        <Row label="Lifetime Credits" value={credits.lifetime} />
        <Row
          label="Last Updated"
          value={lastUpdated ? formatDate(lastUpdated) : "—"}
        />
      </dl>
    </section>
  );
}
