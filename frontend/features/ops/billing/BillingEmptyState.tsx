import React from "react";
import { Wallet } from "lucide-react";

/**
 * BillingEmptyState — OPS-07 (Part F).
 *
 * Purposeful empty state, e.g. before a user is selected. Presentational only.
 * Semantic tokens; English-only.
 */
export function BillingEmptyState({
  title = "Select a user",
  message = "Search for a user above to view and manage their credit balance.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card p-12 text-center">
      <Wallet className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
