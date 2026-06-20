"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import {
  Card,
  CardHeader,
  CardDescription,
  CardContent,
} from "@/components/ui";
import type { SectionTrend } from "@/features/trends/trendsService";

/*
 * Sections C & D — Subject / Topic trends (Sprint 4 · T27).
 *
 * Reusable: renders backend section groups, each with a chronological accuracy
 * history. Display only — bar widths clamp the backend accuracy for layout.
 * Titles/empty copy are passed in so one component serves both scopes.
 */

function clampPct(value: string | null): number {
  const n = value == null ? 0 : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export function SectionTrendCard({
  title,
  subtitle,
  emptyText,
  groups,
}: {
  title: string;
  subtitle: string;
  emptyText: string;
  groups: SectionTrend[];
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
          {title}
        </h2>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="space-y-5">
            {groups.map((group) => (
              <li key={group.scope_id} className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {group.scope_name}
                </h3>
                <ol
                  className="space-y-2"
                  aria-label={t("history_aria", { name: group.scope_name })}
                >
                  {group.history.map((point, i) => {
                    const width = clampPct(point.accuracy);
                    return (
                      <li key={`${point.attempt_id}-${i}`} className="space-y-1">
                        <div className="flex items-baseline justify-between gap-3 text-xs">
                          <span className="text-muted-foreground">
                            {formatDate(point.created_at)}
                          </span>
                          <span className="font-medium text-foreground">
                            {point.accuracy ?? "0"}%
                          </span>
                        </div>
                        <div
                          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                          role="progressbar"
                          aria-valuenow={Math.round(width)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${group.scope_name} ${formatDate(point.created_at)}`}
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
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
