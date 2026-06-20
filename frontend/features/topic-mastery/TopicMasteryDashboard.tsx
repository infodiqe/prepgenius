"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, Compass, Layers } from "lucide-react";

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
  getTopicPerformance,
  type TopicPerformance,
} from "@/features/topic-mastery/topicMasteryService";
import { TopicMasteryList } from "./components/TopicMasteryList";
import { TopicMasterySkeleton } from "./components/TopicMasterySkeleton";

/*
 * Topic Mastery Dashboard — Sprint 4 · T26.
 *
 * Frontend-only, read-only. Consumes the existing T23 endpoint as the source of
 * truth; no analytics/rankings computed (sorting only re-orders backend rows).
 * Mirrors the ReadinessDashboard / AssessmentHistory orchestrator pattern.
 *
 * Frameworks: T01 toast + T02 useErrorToast, T03 skeleton, T04 empty states,
 * T05b card/button primitives, tokens, next-intl.
 */

type Phase = "loading" | "ready" | "error" | "no_exam";

export function TopicMasteryDashboard() {
  const t = useTranslations("topic_mastery");
  const notifyError = useErrorToast();
  const { user, isLoading: authLoading } = useAuth();
  const examId = user?.target_exam_id ?? null;

  const [phase, setPhase] = React.useState<Phase>("loading");
  const [topics, setTopics] = React.useState<TopicPerformance[]>([]);

  const load = React.useCallback(async () => {
    if (!examId) {
      setPhase("no_exam");
      return;
    }
    setPhase("loading");
    try {
      const data = await getTopicPerformance(examId);
      setTopics(data);
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
        <TopicMasterySkeleton />
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

  if (topics.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {heading}
        <Card>
          <CardContent className="p-0">
            <EmptyState className="py-10">
              <EmptyStateIcon>
                <Layers />
              </EmptyStateIcon>
              <EmptyStateTitle as="h2">{t("empty_title")}</EmptyStateTitle>
              <EmptyStateDescription>{t("empty_desc")}</EmptyStateDescription>
            </EmptyState>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {heading}
      <TopicMasteryList topics={topics} />
    </div>
  );
}
