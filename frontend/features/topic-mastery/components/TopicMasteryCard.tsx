"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Card, CardHeader, CardContent } from "@/components/ui";
import type { TopicPerformance } from "@/features/topic-mastery/topicMasteryService";

/*
 * Topic Mastery Card — Sprint 4 · T26.
 *
 * Renders one topic's backend-computed performance verbatim. No derived
 * metrics: the success-rate bar only clamps the backend percentage for layout.
 */

function clampPct(value: string | null): number {
  const n = value == null ? 0 : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString();
}

export function TopicMasteryCard({ topic }: { topic: TopicPerformance }) {
  const t = useTranslations("topic_mastery");
  const headingId = React.useId();
  const width = clampPct(topic.success_rate);
  const lastPractised = formatDate(topic.last_practiced_at);

  return (
    <Card role="region" aria-labelledby={headingId}>
      <CardHeader className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3
            id={headingId}
            className="text-base font-semibold leading-snug tracking-tight text-foreground"
          >
            {topic.topic_name}
          </h3>
          <span className="shrink-0 text-lg font-bold text-foreground">
            {topic.success_rate ?? "0"}%
          </span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={Math.round(width)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("success_aria", { value: topic.success_rate ?? "0" })}
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${width}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">{t("stat_attempts")}</dt>
            <dd className="text-sm font-semibold text-foreground">
              {topic.attempts}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("stat_correct")}</dt>
            <dd className="text-sm font-semibold text-foreground">
              {topic.correct}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("stat_avg_time")}</dt>
            <dd className="text-sm font-semibold text-foreground">
              {t("avg_time_value", { value: topic.avg_time ?? "0" })}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              {t("stat_last_practiced")}
            </dt>
            <dd className="text-sm font-semibold text-foreground">
              {lastPractised ?? t("never")}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
