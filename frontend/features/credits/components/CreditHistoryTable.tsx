import React from "react";
import { getTranslations } from "next-intl/server";

import { cn } from "@/lib/utils";
import type {
  CreditLedgerEntry,
  CreditTransactionType,
} from "../creditService";

/**
 * CreditHistoryTable — learner-facing credit usage history (SPRINT-5A-04/05).
 *
 * Server component. READ-ONLY, backend-ordered (newest first). Money fields are
 * exact decimal strings from the server. The internal `created_by` audit field
 * is deliberately not shown to learners. English column structure mirrors the
 * ops ledger table; all visible copy is i18n-externalised.
 */
function formatDate(iso: string): string {
  // Server component: deterministic locale-independent display.
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
}

export async function CreditHistoryTable({
  entries,
  truncated = false,
}: {
  entries: CreditLedgerEntry[];
  /** True when more entries exist beyond this page (cursor `next` present). */
  truncated?: boolean;
}) {
  const t = await getTranslations("credits");

  const typeLabels: Record<CreditTransactionType, string> = {
    grant: t("type.grant"),
    debit: t("type.debit"),
    reservation: t("type.reservation"),
    release: t("type.release"),
    adjustment: t("type.adjustment"),
  };

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card p-10 text-center">
        <p className="text-sm font-medium text-foreground">{t("history_empty_title")}</p>
        <p className="text-sm text-muted-foreground">{t("history_empty_desc")}</p>
      </div>
    );
  }

  const columns = [
    t("col_date"),
    t("col_type"),
    t("col_amount"),
    t("col_balance_after"),
    t("col_description"),
  ];

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{t("history_title")}</caption>
          <thead className="bg-muted/50">
            <tr>
              {columns.map((col) => (
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
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                      {typeLabels[entry.transaction_type] ?? entry.transaction_type}
                    </span>
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-3 py-2 text-right align-middle font-mono tabular-nums",
                      negative ? "text-destructive" : "text-emerald-500",
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {truncated && (
        <p className="text-xs text-muted-foreground">{t("history_truncated")}</p>
      )}
    </div>
  );
}
