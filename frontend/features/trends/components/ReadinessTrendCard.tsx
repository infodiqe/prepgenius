"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import {
  Card,
  CardHeader,
  CardDescription,
  CardContent,
} from "@/components/ui";
import type { ReadinessTrendPoint } from "@/features/trends/trendsService";

/*
 * Section B — Readiness Timeline (Sprint 4 · T27).
 *
 * Chronological readiness history (score + band + computed_at) as an ordered
 * timeline. Backend values only; no computation.
 */

const BAND_KEYS: Record<string, string> = {
  needs_improvement: "band_needs_improvement",
  developing: "band_developing",
  on_track: "band_on_track",
  exam_ready: "band_exam_ready",
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export function ReadinessTrendCard({
  timeline,
}: {
  timeline: ReadinessTrendPoint[];
}) {
  const t = useTranslations("trends");
  const headingId = React.useId();

  return (
    <Card role="region" aria-labelledby={headingId}>
      <CardHeader>
        <h2
          id={headingId}
          className="text-lg font-semibold leading-none tracking-tight text-foreground"
        >
          {t("readiness_title")}
        </h2>
        <CardDescription>{t("readiness_subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("readiness_empty")}</p>
        ) : (
          <ol className="space-y-3">
            {timeline.map((point, i) => {
              const bandLabel = point.band
                ? t(BAND_KEYS[point.band] ?? "readiness_title")
                : null;
              return (
                <li
                  key={`${point.computed_at}-${i}`}
                  className="flex items-baseline justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {point.score ?? "0"}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimestamp(point.computed_at)}
                    </p>
                  </div>
                  {point.band && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {bandLabel}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
