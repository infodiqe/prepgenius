"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import {
  Card,
  CardHeader,
  CardDescription,
  CardContent,
} from "@/components/ui";
import type { AttemptTrendPoint } from "@/features/trends/trendsService";

/*
 * Section A — Overall Progress (Sprint 4 · T27).
 *
 * Chronological scored-attempt history as an accessible table. Backend values
 * only; no computation.
 */

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export function AttemptTrendCard({ attempts }: { attempts: AttemptTrendPoint[] }) {
  const t = useTranslations("trends");
  const headingId = React.useId();

  return (
    <Card role="region" aria-labelledby={headingId}>
      <CardHeader>
        <h2
          id={headingId}
          className="text-lg font-semibold leading-none tracking-tight text-foreground"
        >
          {t("overall_title")}
        </h2>
        <CardDescription>{t("overall_subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        {attempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("overall_empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">{t("overall_title")}</caption>
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("col_date")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    {t("col_score")}
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    {t("col_accuracy")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.attempt_id} className="border-b border-border/60">
                    <td className="py-2 pr-3 text-foreground">
                      {formatDate(a.created_at)}
                    </td>
                    <td className="py-2 pr-3 text-foreground">
                      {a.score ?? "0"} / {a.max_score ?? "0"}
                    </td>
                    <td className="py-2 font-medium text-foreground">
                      {a.accuracy ?? "0"}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
