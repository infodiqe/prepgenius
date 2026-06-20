"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Activity } from "lucide-react";

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
import type { RecentActivity } from "@/features/history/historyService";

/*
 * Recent Progress — Sprint 4 · T21, Section D.
 *
 * Renders the backend's `recent_activity` (≤5 latest scored attempts) as score
 * and accuracy values per attempt, oldest → newest. Display only: no trend
 * math, no forecasting, no readiness inference. Bar widths use the
 * backend-provided accuracy (clamped) purely for layout.
 */

function accuracyWidth(accuracy: string | null): number {
  const n = accuracy == null ? 0 : Number(accuracy);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export function RecentProgress({
  recentActivity,
}: {
  recentActivity: RecentActivity[];
}) {
  const t = useTranslations("history");
  const headingId = React.useId();

  // Backend returns most-recent-first; show oldest → newest for left-to-right reading.
  const ordered = React.useMemo(
    () => [...recentActivity].reverse(),
    [recentActivity],
  );

  return (
    <Card role="region" aria-labelledby={headingId}>
      <CardHeader>
        <h2
          id={headingId}
          className="text-lg font-semibold leading-none tracking-tight text-foreground"
        >
          {t("recent_title")}
        </h2>
        <CardDescription>{t("recent_subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        {ordered.length === 0 ? (
          <EmptyState className="py-6">
            <EmptyStateIcon>
              <Activity />
            </EmptyStateIcon>
            <EmptyStateTitle as="h3">{t("recent_empty_title")}</EmptyStateTitle>
            <EmptyStateDescription>
              {t("recent_empty_desc")}
            </EmptyStateDescription>
          </EmptyState>
        ) : (
          <ol className="space-y-3">
            {ordered.map((a, i) => {
              const width = accuracyWidth(a.accuracy);
              return (
                <li key={a.id} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-xs font-medium text-foreground">
                      {t("recent_item", { n: i + 1, date: formatDate(a.created_at) })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("history_score", {
                        score: a.score ?? "0",
                        max: a.max_score ?? "0",
                      })}
                      {" · "}
                      {t("history_accuracy", { value: a.accuracy ?? "0" })}
                    </span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={Math.round(width)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={t("recent_aria", { n: i + 1 })}
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
