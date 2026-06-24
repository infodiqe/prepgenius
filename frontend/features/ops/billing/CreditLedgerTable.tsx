import React from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  formatDate,
  type CreditLedgerEntry,
  type CreditTransactionType,
} from "./billingService";

/**
 * CreditLedgerTable — OPS-07 (Part D).
 *
 * READ-ONLY, backend-ordered (newest first) credit ledger. The per-user ops
 * endpoint returns a single capped page (the most recent 20 entries) with no
 * cursor, so there is no page-number math here — pagination is cursor-driven
 * only and surfaced via the optional `onNext`/`onPrev` props (used verbatim when
 * a future cursor source provides them). Money/IDs are exact strings from the
 * server. Accessible table semantics; English-only.
 */
const TYPE_LABELS: Record<CreditTransactionType, string> = {
  grant: "Grant",
  debit: "Debit",
  reservation: "Reservation",
  release: "Release",
  adjustment: "Adjustment",
};

const COLUMNS = [
  "Date",
  "Transaction Type",
  "Amount",
  "Balance After",
  "Description",
  "Created By",
] as const;

function TypeBadge({ type }: { type: CreditTransactionType }) {
  return (
    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

export interface CreditLedgerTableProps {
  entries: CreditLedgerEntry[];
  /** Cursor controls (optional; rendered only when a cursor source provides them). */
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function CreditLedgerTable({
  entries,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: CreditLedgerTableProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card p-10 text-center">
        <p className="text-sm font-medium text-foreground">No ledger entries</p>
        <p className="text-sm text-muted-foreground">
          This user has no credit history yet.
        </p>
      </div>
    );
  }

  const showCursor = Boolean(onPrev || onNext);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Credit ledger</caption>
          <thead className="bg-muted/50">
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const negative = entry.amount.trim().startsWith("-");
              return (
                <tr key={entry.id} className="border-t border-border">
                  <td className="whitespace-nowrap px-3 py-2 align-middle text-muted-foreground">
                    {formatDate(entry.created_at)}
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <TypeBadge type={entry.transaction_type} />
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-3 py-2 text-right align-middle font-mono tabular-nums",
                      negative ? "text-destructive" : "text-foreground",
                    )}
                  >
                    {entry.amount}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right align-middle font-mono tabular-nums text-foreground">
                    {entry.balance_after}
                  </td>
                  <td className="max-w-xs px-3 py-2 align-middle text-foreground">
                    <span className="line-clamp-2">
                      {entry.description?.trim() ? entry.description : "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-middle font-mono text-xs text-muted-foreground">
                    {entry.created_by ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showCursor && (
        <nav
          aria-label="Ledger pagination"
          className="flex items-center justify-end gap-2"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasPrev}
            onClick={onPrev}
            aria-label="Previous page"
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasNext}
            onClick={onNext}
            aria-label="Next page"
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}
