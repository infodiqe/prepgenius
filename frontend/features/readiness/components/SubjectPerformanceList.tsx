"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { BookOpen } from "lucide-react";

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
import type { SubjectAnalytic } from "@/features/readiness/readinessService";

/*
 * Subject Performance — Sprint 4 · T20, Section B.
 *
 * Renders the backend-computed per-subject breakdown from the latest scored
 * attempt's /analytics/ endpoint. No analytics computed here: accuracy/correct/
 * total come from the API; we only render them (and clamp the bar width).
 */

/** Clamp a backend decimal-string percentage to a 0–100 bar width (display only). */
function barWidth(accuracy: string | null): number {
  const n = accuracy == null ? 0 : Number(accuracy);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export function SubjectPerformanceList({
  subjects,
}: {
  subjects: SubjectAnalytic[];
}) {
  const t = useTranslations("readiness");
  const headingId = React.useId();

  return (
    <Card role="region" aria-labelledby={headingId}>
      <CardHeader>
        <h2
          id={headingId}
          className="text-lg font-semibold leading-none tracking-tight text-foreground"
        >
          {t("subjects_title")}
        </h2>
        <CardDescription>{t("subjects_subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        {subjects.length === 0 ? (
          <EmptyState className="py-6">
            <EmptyStateIcon>
              <BookOpen />
            </EmptyStateIcon>
            <EmptyStateTitle as="h3">
              {t("subjects_empty_title")}
            </EmptyStateTitle>
            <EmptyStateDescription>
              {t("subjects_empty_desc")}
            </EmptyStateDescription>
          </EmptyState>
        ) : (
          <ul className="space-y-4">
            {subjects.map((s) => {
              const width = barWidth(s.accuracy);
              return (
                <li key={s.id} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">
                      {s.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("subject_meta", {
                        accuracy: s.accuracy ?? "0",
                        correct: s.correct,
                        total: s.total,
                      })}
                    </span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={Math.round(width)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={t("subject_aria", { name: s.name })}
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
