"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Compass } from "lucide-react";

import {
  Card,
  CardContent,
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
  ErrorState,
} from "@/components/ui";
import { useAuth } from "@/features/auth/AuthContext";
import { useErrorToast } from "@/features/feedback/useErrorToast";
import {
  listScoredAttempts,
  getHistoryDashboard,
  type ScoredAttempt,
  type Dashboard,
} from "@/features/history/historyService";
import { AssessmentHistoryList } from "./components/AssessmentHistoryList";
import { WeakTopicDeepDive } from "./components/WeakTopicDeepDive";
import { RecentProgress } from "./components/RecentProgress";
import { HistorySkeleton } from "./components/HistorySkeleton";

/*
 * Assessment History & Insights — Sprint 4 · T21 (the /history experience).
 *
 * Frontend-only, read-only. Existing analytics endpoints only; no calculations.
 * Sections: A (assessment list), C (weak-topic deep dive), D (recent progress).
 * Section B (per-attempt deep dive) is its own route, /history/[attemptId].
 *
 * Frameworks: T01 toast + T02 useErrorToast, T03 skeleton, T04 empty states,
 * T05b cards/buttons, tokens, next-intl.
 */

type Phase = "loading" | "ready" | "error" | "no_exam";

export function AssessmentHistory() {
  const t = useTranslations("history");
  const notifyError = useErrorToast();
  const { user, isLoading: authLoading } = useAuth();
  const examId = user?.target_exam_id ?? null;

  const [phase, setPhase] = React.useState<Phase>("loading");
  const [attempts, setAttempts] = React.useState<ScoredAttempt[]>([]);
  const [dashboard, setDashboard] = React.useState<Dashboard | null>(null);

  const load = React.useCallback(async () => {
    if (!examId) {
      setPhase("no_exam");
      return;
    }
    setPhase("loading");
    try {
      const [list, dash] = await Promise.all([
        listScoredAttempts(examId),
        getHistoryDashboard(examId),
      ]);
      setAttempts(list);
      setDashboard(dash);
      setPhase("ready");
    } catch (err) {
      notifyError(err);
      setPhase("error");
    }
  }, [examId, notifyError]);

  React.useEffect(() => {
    if (authLoading) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, examId]);

  const heading = (
    <header className="space-y-1">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        {t("title")}
      </h1>
      <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
    </header>
  );

  if (authLoading || phase === "loading") {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {heading}
        <HistorySkeleton />
      </div>
    );
  }

  if (phase === "no_exam") {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {heading}
        <Card>
          <CardContent className="p-0">
            <EmptyState className="py-10">
              <EmptyStateIcon>
                <Compass />
              </EmptyStateIcon>
              <EmptyStateTitle as="h2">{t("no_exam_title")}</EmptyStateTitle>
              <EmptyStateDescription>{t("no_exam_desc")}</EmptyStateDescription>
            </EmptyState>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {heading}
        <ErrorState
          onRetry={() => load()}
          title={t("error_title")}
          description={t("error_desc")}
          retryLabel={t("retry")}
          headingLevel="h2"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {heading}
      <AssessmentHistoryList attempts={attempts} />
      <RecentProgress recentActivity={dashboard?.recent_activity ?? []} />
      <WeakTopicDeepDive
        weakTopics={dashboard?.weak_topics ?? []}
        recommendations={dashboard?.recommendations ?? []}
      />
    </div>
  );
}
