"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle, Compass } from "lucide-react";

import {
  Card,
  CardContent,
  Button,
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateAction,
} from "@/components/ui";
import { useAuth } from "@/features/auth/AuthContext";
import { useErrorToast } from "@/features/feedback/useErrorToast";
import {
  getReadinessDashboard,
  getAttemptSubjectAnalytics,
  getReadiness,
  type Dashboard,
  type SubjectAnalytic,
  type Readiness,
} from "@/features/readiness/readinessService";
import { ReadinessScoreCard } from "./components/ReadinessScoreCard";
import { SubjectPerformanceList } from "./components/SubjectPerformanceList";
import { WeakTopicsList } from "./components/WeakTopicsList";
import { StudyRecommendationsList } from "./components/StudyRecommendationsList";
import { ReadinessSkeleton } from "./components/ReadinessSkeleton";

/*
 * Student Readiness Dashboard — Sprint 4 · T20.
 *
 * Frontend-only. Consumes existing analytics endpoints as the source of truth
 * (no backend changes, no frontend analytics): GET /analytics/readiness/ for the
 * readiness score (T22/T25), /dashboard/ for weak topics + recommendations, and
 * the latest scored attempt's /analytics/ for subject performance.
 *
 * Frameworks: T01 toast + T02 useErrorToast (errors), T03 skeleton (loading),
 * T04 empty states, T05b card/button primitives, tokens, next-intl.
 */

type Phase = "loading" | "ready" | "error" | "no_exam";

export function ReadinessDashboard() {
  const t = useTranslations("readiness");
  const router = useRouter();
  const notifyError = useErrorToast();
  const { user, isLoading: authLoading } = useAuth();
  const examId = user?.target_exam_id ?? null;

  const [phase, setPhase] = React.useState<Phase>("loading");
  const [dashboard, setDashboard] = React.useState<Dashboard | null>(null);
  const [readiness, setReadiness] = React.useState<Readiness | null>(null);
  const [subjects, setSubjects] = React.useState<SubjectAnalytic[]>([]);

  const load = React.useCallback(async () => {
    if (!examId) {
      setPhase("no_exam");
      return;
    }
    setPhase("loading");
    try {
      // Readiness (T25) + dashboard are core to the page; a failure of either
      // surfaces the shared error+retry state. A provisional readiness response
      // is a normal 200 (handled by the card), not an error.
      const [readinessData, dash] = await Promise.all([
        getReadiness(examId),
        getReadinessDashboard(examId),
      ]);
      // Subject performance comes from the most recent scored attempt; best-effort
      // so a per-attempt analytics hiccup never blanks the whole page.
      let subjectList: SubjectAnalytic[] = [];
      const latest = dash.recent_activity[0];
      if (latest) {
        try {
          const analytics = await getAttemptSubjectAnalytics(latest.id);
          subjectList = analytics.subjects;
        } catch {
          subjectList = [];
        }
      }
      setReadiness(readinessData);
      setDashboard(dash);
      setSubjects(subjectList);
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
        <ReadinessSkeleton />
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
              <EmptyStateDescription>
                {t("no_exam_desc")}
              </EmptyStateDescription>
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
        <Card>
          <CardContent className="p-0">
            <EmptyState className="py-10">
              <EmptyStateIcon className="bg-destructive/10 text-destructive">
                <AlertCircle />
              </EmptyStateIcon>
              <EmptyStateTitle as="h2">{t("error_title")}</EmptyStateTitle>
              <EmptyStateDescription>{t("error_desc")}</EmptyStateDescription>
              <EmptyStateAction>
                <Button type="button" onClick={() => load()}>
                  {t("retry")}
                </Button>
              </EmptyStateAction>
            </EmptyState>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ready
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {heading}
      {readiness && <ReadinessScoreCard readiness={readiness} />}
      <SubjectPerformanceList subjects={subjects} />
      <WeakTopicsList weakTopics={dashboard?.weak_topics ?? []} />
      <StudyRecommendationsList
        recommendations={dashboard?.recommendations ?? []}
      />
    </div>
  );
}
