"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Lightbulb, ArrowRight } from "lucide-react";

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
import type { Recommendation } from "@/features/readiness/readinessService";

/*
 * Study Recommendations — Sprint 4 · T20, Section D.
 *
 * Renders the backend's analytics-derived recommendations (from /dashboard/) —
 * `recommended_action` + topic/subject. No AI, no frontend generation; the list
 * is the backend's, rendered as-is.
 */
export function StudyRecommendationsList({
  recommendations,
}: {
  recommendations: Recommendation[];
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
          {t("reco_title")}
        </h2>
        <CardDescription>{t("reco_subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <EmptyState className="py-6">
            <EmptyStateIcon>
              <Lightbulb />
            </EmptyStateIcon>
            <EmptyStateTitle as="h3">{t("reco_empty_title")}</EmptyStateTitle>
            <EmptyStateDescription>
              {t("reco_empty_desc")}
            </EmptyStateDescription>
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {recommendations.map((rec) => (
              <li
                key={rec.topic_id}
                className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3"
              >
                <ArrowRight
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {rec.recommended_action}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {rec.topic_name} · {rec.subject_name}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
