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
import type { WeakTopic } from "@/features/readiness/readinessService";

/*
 * Weak Topics — Sprint 4 · T20, Section C.
 *
 * Lists the backend's active weak topics (from /dashboard/). Ordered by the
 * backend-provided `severity` (highest priority first) — display ordering only,
 * no analytics computed. Shows the top N with a View All / Show less toggle.
 */

const DEFAULT_VISIBLE = 3;

export function WeakTopicsList({ weakTopics }: { weakTopics: WeakTopic[] }) {
  const t = useTranslations("readiness");
  const headingId = React.useId();
  const [expanded, setExpanded] = React.useState(false);

  // Highest severity first; stable for equal severities.
  const ordered = React.useMemo(
    () => [...weakTopics].sort((a, b) => b.severity - a.severity),
    [weakTopics],
  );
  const visible = expanded ? ordered : ordered.slice(0, DEFAULT_VISIBLE);
  const hasMore = ordered.length > DEFAULT_VISIBLE;

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
      <CardContent>
        {ordered.length === 0 ? (
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
            <ol className="space-y-3">
              {visible.map((topic, index) => (
                <li
                  key={topic.topic_id}
                  className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3"
                >
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {topic.topic_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("weak_priority", { rank: index + 1 })}
                      {topic.accuracy != null && (
                        <>
                          {" · "}
                          {t("weak_accuracy", { value: topic.accuracy })}
                        </>
                      )}
                    </p>
                  </div>
                  <TrendingDown
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </li>
              ))}
            </ol>
            {hasMore && (
              <Button
                type="button"
                variant="link"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="mt-3 h-auto p-0 text-sm font-semibold"
              >
                {expanded
                  ? t("show_less")
                  : t("view_all", { count: ordered.length })}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
