"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ClipboardList, ChevronRight } from "lucide-react";

import {
  Card,
  CardHeader,
  CardDescription,
  CardContent,
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
} from "@/components/ui";
import type { ScoredAttempt } from "@/features/history/historyService";

/*
 * Assessment History — Sprint 4 · T21, Section A.
 *
 * Lists scored attempts from the existing attempts list endpoint. Renders only
 * backend values; each row links to the per-attempt deep dive. Mobile-first
 * cards (single column).
 */

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export function AssessmentHistoryList({
  attempts,
}: {
  attempts: ScoredAttempt[];
}) {
  const t = useTranslations("history");
  const headingId = React.useId();

  const typeLabel = (type: string) => {
    // Localized label per known type; fall back to the raw value.
    const known = [
      "full_mock",
      "previous_year",
      "mixed",
      "topic",
      "subject",
      "daily",
    ];
    return known.includes(type) ? t(`type_${type}`) : type;
  };

  return (
    <Card role="region" aria-labelledby={headingId}>
      <CardHeader>
        <h2
          id={headingId}
          className="text-lg font-semibold leading-none tracking-tight text-foreground"
        >
          {t("history_title")}
        </h2>
        <CardDescription>{t("history_subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        {attempts.length === 0 ? (
          <EmptyState className="py-6">
            <EmptyStateIcon>
              <ClipboardList />
            </EmptyStateIcon>
            <EmptyStateTitle as="h3">
              {t("history_empty_title")}
            </EmptyStateTitle>
            <EmptyStateDescription>
              {t("history_empty_desc")}
            </EmptyStateDescription>
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {attempts.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/history/${a.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-4 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span className="text-sm font-semibold text-foreground">
                        {typeLabel(a.attempt_type)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t("history_date", { date: formatDate(a.created_at) })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("history_score", {
                        score: a.score ?? "0",
                        max: a.max_score ?? "0",
                      })}
                      {" · "}
                      {t("history_accuracy", { value: a.accuracy ?? "0" })}
                      {" · "}
                      {t("history_correct", {
                        correct: a.correct,
                        incorrect: a.incorrect,
                      })}
                    </p>
                    {a.submitted_at && (
                      <p className="text-[11px] text-muted-foreground">
                        {t("history_submitted", {
                          date: formatDate(a.submitted_at),
                        })}
                      </p>
                    )}
                  </div>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
