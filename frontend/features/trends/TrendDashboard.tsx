"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Compass, LineChart } from "lucide-react";

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
  getAttemptTrend,
  getReadinessTrend,
  getSectionTrend,
  type AttemptTrendPoint,
  type ReadinessTrendPoint,
  type SectionTrend,
} from "@/features/trends/trendsService";
import { AttemptTrendCard } from "./components/AttemptTrendCard";
import { ReadinessTrendCard } from "./components/ReadinessTrendCard";
import { SectionTrendCard } from "./components/SectionTrendCard";
import { TrendSkeleton } from "./components/TrendSkeleton";

/*
 * Trend & Progress Dashboard — Sprint 4 · T27.
 *
 * Frontend-only, read-only. Consumes the existing T24 trend endpoints as the
 * source of truth; computes nothing (no trends/forecasts/derived metrics).
 * Mirrors the ReadinessDashboard / TopicMasteryDashboard orchestrator pattern.
 *
 * Frameworks: T01 toast + T02 useErrorToast, T03 skeleton, T04 empty states,
 * T05b card/button primitives, tokens, next-intl.
 */

type Phase = "loading" | "ready" | "error" | "no_exam";

export function TrendDashboard() {
  const t = useTranslations("trends");
  const notifyError = useErrorToast();
  const { user, isLoading: authLoading } = useAuth();
  const examId = user?.target_exam_id ?? null;

  const [phase, setPhase] = React.useState<Phase>("loading");
  const [attempts, setAttempts] = React.useState<AttemptTrendPoint[]>([]);
  const [readiness, setReadiness] = React.useState<ReadinessTrendPoint[]>([]);
  const [subjects, setSubjects] = React.useState<SectionTrend[]>([]);
  const [topics, setTopics] = React.useState<SectionTrend[]>([]);

  const load = React.useCallback(async () => {
    if (!examId) {
      setPhase("no_exam");
      return;
    }
    setPhase("loading");
    try {
      const [attemptData, readinessData, subjectData, topicData] =
        await Promise.all([
          getAttemptTrend(examId),
          getReadinessTrend(examId),
          getSectionTrend(examId, "subject"),
          getSectionTrend(examId, "topic"),
        ]);
      setAttempts(attemptData);
      setReadiness(readinessData);
      setSubjects(subjectData);
      setTopics(topicData);
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

  const shell = (children: React.ReactNode) => (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {heading}
      {children}
    </div>
  );

  if (authLoading || phase === "loading") {
    return shell(<TrendSkeleton />);
  }

  if (phase === "no_exam") {
    return shell(
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
      </Card>,
    );
  }

  if (phase === "error") {
    return shell(
      <ErrorState
        onRetry={() => load()}
        title={t("error_title")}
        description={t("error_desc")}
        retryLabel={t("retry")}
        headingLevel="h2"
      />,
    );
  }

  const hasAny =
    attempts.length > 0 ||
    readiness.length > 0 ||
    subjects.length > 0 ||
    topics.length > 0;

  if (!hasAny) {
    return shell(
      <Card>
        <CardContent className="p-0">
          <EmptyState className="py-10">
            <EmptyStateIcon>
              <LineChart />
            </EmptyStateIcon>
            <EmptyStateTitle as="h2">{t("empty_title")}</EmptyStateTitle>
            <EmptyStateDescription>{t("empty_desc")}</EmptyStateDescription>
          </EmptyState>
        </CardContent>
      </Card>,
    );
  }

  return shell(
    <>
      <AttemptTrendCard attempts={attempts} />
      <ReadinessTrendCard timeline={readiness} />
      <SectionTrendCard
        title={t("subjects_title")}
        subtitle={t("subjects_subtitle")}
        emptyText={t("subjects_empty")}
        groups={subjects}
      />
      <SectionTrendCard
        title={t("topics_title")}
        subtitle={t("topics_subtitle")}
        emptyText={t("topics_empty")}
        groups={topics}
      />
    </>,
  );
}
