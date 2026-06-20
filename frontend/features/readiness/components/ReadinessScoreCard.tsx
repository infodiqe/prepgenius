"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Gauge } from "lucide-react";

import {
  Card,
  CardHeader,
  CardContent,
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
} from "@/components/ui";
import type { Readiness } from "@/features/readiness/readinessService";

/*
 * Readiness Score Card — Sprint 4 · T25, Section A.
 *
 * Renders the backend ExamReadinessScore (GET /api/v1/analytics/readiness/)
 * exactly as returned — score, band, computed_at, and the component breakdown.
 * No frontend analytics: bar widths only clamp backend percentages for layout.
 * A `provisional` backend response renders the T04 empty state.
 */

const COMPONENT_KEYS = [
  "mock_performance",
  "subject_accuracy",
  "topic_accuracy",
  "consistency",
  "practice_completion",
] as const;

const BAND_KEYS: Record<string, string> = {
  needs_improvement: "band_needs_improvement",
  developing: "band_developing",
  on_track: "band_on_track",
  exam_ready: "band_exam_ready",
};

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export function ReadinessScoreCard({ readiness }: { readiness: Readiness }) {
  const t = useTranslations("readiness");
  const headingId = React.useId();

  const isProvisional =
    readiness.status === "provisional" || readiness.score == null;

  if (isProvisional) {
    return (
      <Card role="region" aria-labelledby={headingId}>
        <CardContent className="p-0">
          <EmptyState className="py-8">
            <EmptyStateIcon>
              <Gauge />
            </EmptyStateIcon>
            <EmptyStateTitle id={headingId} as="h2">
              {t("score_title")}
            </EmptyStateTitle>
            <EmptyStateDescription>
              {t("score_provisional")}
            </EmptyStateDescription>
          </EmptyState>
        </CardContent>
      </Card>
    );
  }

  const bandLabel = readiness.band
    ? t(BAND_KEYS[readiness.band] ?? "score_title") // safe: known bands only
    : null;
  const scores = readiness.components.scores ?? {};

  return (
    <Card role="region" aria-labelledby={headingId}>
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2
            id={headingId}
            className="text-lg font-semibold leading-none tracking-tight text-foreground"
          >
            {t("score_title")}
          </h2>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span
            className="text-3xl font-bold text-foreground"
            aria-label={t("score_aria", { value: readiness.score ?? "0" })}
          >
            {readiness.score}%
          </span>
          {readiness.band && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {bandLabel}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("score_updated", { date: formatTimestamp(readiness.computed_at) })}
        </p>
      </CardHeader>
      <CardContent>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("breakdown_title")}
        </h3>
        <dl className="space-y-3">
          {COMPONENT_KEYS.filter((k) => scores[k] != null).map((key) => {
            const value = scores[key] as number;
            const width = clampPct(value);
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-sm text-foreground">{t(`comp_${key}`)}</dt>
                  <dd className="text-xs font-medium text-muted-foreground">
                    {value}%
                  </dd>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={Math.round(width)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t(`comp_${key}`)}
                >
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </dl>
      </CardContent>
    </Card>
  );
}
