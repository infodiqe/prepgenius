"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { TrendingDown, Sparkles } from "lucide-react";

import {
  Card,
  CardHeader,
  CardDescription,
  CardContent,
  Button,
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import type {
  WeakTopic,
  Recommendation,
} from "@/features/history/historyService";

/*
 * Weak Topic Deep Dive — Sprint 4 · T21, Section C.
 *
 * Renders backend weak topics (from /dashboard/) with the matching backend
 * recommendation. Supports filtering by the backend-provided severity and a
 * View All / Show less toggle. No derived metrics — severity/accuracy/action
 * are all backend values; we only order/filter/slice for display.
 */

const DEFAULT_VISIBLE = 4;
type SeverityFilter = "all" | 3 | 2 | 1;
const FILTERS: SeverityFilter[] = ["all", 3, 2, 1];

export function WeakTopicDeepDive({
  weakTopics,
  recommendations,
}: {
  weakTopics: WeakTopic[];
  recommendations: Recommendation[];
}) {
  const t = useTranslations("history");
  const headingId = React.useId();
  const [filter, setFilter] = React.useState<SeverityFilter>("all");
  const [expanded, setExpanded] = React.useState(false);

  const actionByTopic = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const r of recommendations) map.set(r.topic_id, r.recommended_action);
    return map;
  }, [recommendations]);

  const filtered = React.useMemo(() => {
    const ordered = [...weakTopics].sort((a, b) => b.severity - a.severity);
    return filter === "all"
      ? ordered
      : ordered.filter((w) => w.severity === filter);
  }, [weakTopics, filter]);

  const visible = expanded ? filtered : filtered.slice(0, DEFAULT_VISIBLE);
  const hasMore = filtered.length > DEFAULT_VISIBLE;

  const severityLabel = (s: number) =>
    s >= 3 ? t("severity_high") : s === 2 ? t("severity_medium") : t("severity_low");

  return (
    <Card role="region" aria-labelledby={headingId}>
      <CardHeader>
        <h2
          id={headingId}
          className="text-lg font-semibold leading-none tracking-tight text-foreground"
        >
          {t("weak_title")}
        </h2>
        <CardDescription>{t("weak_subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Severity filter */}
        <div
          role="group"
          aria-label={t("weak_filter_label")}
          className="flex flex-wrap gap-2"
        >
          {FILTERS.map((f) => (
            <Button
              key={String(f)}
              type="button"
              size="sm"
              variant={filter === f ? "default" : "outline"}
              aria-pressed={filter === f}
              onClick={() => {
                setFilter(f);
                setExpanded(false);
              }}
            >
              {f === "all" ? t("weak_filter_all") : severityLabel(f)}
            </Button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState className="py-6">
            <EmptyStateIcon>
              <Sparkles />
            </EmptyStateIcon>
            <EmptyStateTitle as="h3">{t("weak_empty_title")}</EmptyStateTitle>
            <EmptyStateDescription>
              {t("weak_empty_desc")}
            </EmptyStateDescription>
          </EmptyState>
        ) : (
          <>
            <ul className="space-y-3">
              {visible.map((w) => (
                <li
                  key={w.topic_id}
                  className="space-y-1 rounded-lg border border-border bg-muted/40 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">
                      {w.topic_name}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        w.severity >= 3
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      {severityLabel(w.severity)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("weak_accuracy", { value: w.accuracy ?? "0" })}
                  </p>
                  {actionByTopic.has(w.topic_id) && (
                    <p className="flex items-start gap-1.5 text-xs text-foreground">
                      <TrendingDown
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <span>{actionByTopic.get(w.topic_id)}</span>
                    </p>
                  )}
                </li>
              ))}
            </ul>
            {hasMore && (
              <Button
                type="button"
                variant="link"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="h-auto p-0 text-sm font-semibold"
              >
                {expanded
                  ? t("show_less")
                  : t("view_all", { count: filtered.length })}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
