import React, { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/features/auth/serverAuth";
import { getDashboardServer } from "@/features/dashboard/dashboardService";
import { listUserAttemptsServer } from "@/features/analytics/analyticsService";
import { getAttemptAnalyticsServer } from "@/features/results/resultsService";
import KPIGrid from "@/features/analytics/components/KPIGrid";
import SubjectAccuracyChart from "@/features/analytics/components/SubjectAccuracyChart";
import TopicPerformanceTable from "@/features/analytics/components/TopicPerformanceTable";
import WeakTopicPanel from "@/features/analytics/components/WeakTopicPanel";
import EmptyAnalyticsState from "@/features/analytics/components/EmptyAnalyticsState";
import AnalyticsSkeleton from "@/features/analytics/components/AnalyticsSkeleton";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ErrorState } from "@/components/ui";
import { AlertCircle } from "lucide-react";

async function AnalyticsContent() {
  const t = await getTranslations("analytics");
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        {t("login_required")}
      </div>
    );
  }

  const examId = user.target_exam_id;
  if (!examId) {
    return (
      <div className="flex h-96 items-center justify-center p-4">
        <Card className="border-border bg-card backdrop-blur-md max-w-md w-full p-6 text-center shadow-xl">
          <CardHeader className="space-y-3 pb-3">
            <div className="mx-auto rounded-full bg-muted p-4 w-fit text-muted-foreground">
              <AlertCircle className="h-10 w-10 text-amber-500" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground">
              {t("no_exam_title")}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              {t("no_exam_desc")}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Fetch dashboard rollup values and list scored attempts on the server
  const [dashboardData, attempts] = await Promise.all([
    getDashboardServer(examId),
    listUserAttemptsServer(examId),
  ]);

  // A failed fetch (null) must not masquerade as "no history" — show the error
  // state with Retry. Only a successful-but-empty list is a true empty state.
  if (attempts === null) {
    return <ErrorState />;
  }

  if (attempts.length === 0) {
    return <EmptyAnalyticsState />;
  }

  // Values supplied by backend (source of truth). overall_accuracy is null when
  // there is no answered-question data → KPIGrid renders "—" (SPRINT-5A-03).
  const overallAccuracy = dashboardData?.overall_accuracy ?? null;
  const totalAttempts = attempts.length;
  
  // Average time of attempts (sum of time / count)
  const totalSeconds = attempts.reduce((acc, curr) => acc + (curr.time_taken_seconds || 0), 0);
  const avgTimeSeconds = Math.round(totalSeconds / totalAttempts);
  
  // Latest attempt details
  const latestAttempt = attempts[0];
  const latestAccuracy = latestAttempt.accuracy ?? "0.00";

  // Fetch detailed subject & topic breakdown from the latest scored attempt
  const latestAttemptAnalytics = await getAttemptAnalyticsServer(latestAttempt.id);

  // Display fallbacks for missing subject/topic names (translations captured
  // here because the topic map parameter below shadows the `t` translator).
  const fallbackSubject = t("fallback_subject");
  const fallbackTopic = t("fallback_topic");

  // Subject accuracy lists
  const subjectList = (latestAttemptAnalytics?.subjects || []).map((s) => ({
    name: s.name || fallbackSubject,
    accuracy: Number(s.accuracy || 0),
  }));

  // Topic accuracy lists
  const topicList = (latestAttemptAnalytics?.topics || []).map((t) => ({
    name: t.name || fallbackTopic,
    accuracy: Number(t.accuracy || 0),
    total: t.total || 0,
    correct: t.correct || 0,
  }));

  return (
    <div className="space-y-8 pb-12">
      <div className="border-b border-border pb-5">
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
          {t("title")}
        </h2>
      </div>

      {/* KPI Cards */}
      <KPIGrid
        overallAccuracy={overallAccuracy}
        totalAttempts={totalAttempts}
        avgTimeSeconds={avgTimeSeconds}
        latestAccuracy={latestAccuracy}
      />

      {/* Charts / Breakdown details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SubjectAccuracyChart data={subjectList} />
        <TopicPerformanceTable topics={topicList} />
      </div>

      {/* Weak Topics panel */}
      <WeakTopicPanel weakTopics={dashboardData?.weak_topics || []} />
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsContent />
    </Suspense>
  );
}
