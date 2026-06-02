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
import { AlertCircle } from "lucide-react";

async function AnalyticsContent() {
  const t = await getTranslations("analytics");
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-400">
        Please log in to view your analytics.
      </div>
    );
  }

  const examId = user.target_exam_id;
  if (!examId) {
    return (
      <div className="flex h-96 items-center justify-center p-4">
        <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-md max-w-md w-full p-6 text-center shadow-xl">
          <CardHeader className="space-y-3 pb-3">
            <div className="mx-auto rounded-full bg-slate-950 p-4 w-fit text-slate-400">
              <AlertCircle className="h-10 w-10 text-amber-500" />
            </div>
            <CardTitle className="text-xl font-bold text-white">
              No Target Exam Selected
            </CardTitle>
            <CardDescription className="text-slate-400 text-sm">
              Please select a target exam in your profile settings to start tracking your performance.
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

  if (!attempts || attempts.length === 0) {
    return <EmptyAnalyticsState />;
  }

  // Compute metrics based on values supplied by backend
  const overallAccuracy = dashboardData?.overall_accuracy ?? "0.00";
  const totalAttempts = attempts.length;
  
  // Average time of attempts (sum of time / count)
  const totalSeconds = attempts.reduce((acc, curr) => acc + (curr.time_taken_seconds || 0), 0);
  const avgTimeSeconds = Math.round(totalSeconds / totalAttempts);
  
  // Latest attempt details
  const latestAttempt = attempts[0];
  const latestAccuracy = latestAttempt.accuracy ?? "0.00";

  // Fetch detailed subject & topic breakdown from the latest scored attempt
  const latestAttemptAnalytics = await getAttemptAnalyticsServer(latestAttempt.id);

  // Subject accuracy lists
  const subjectList = (latestAttemptAnalytics?.subjects || []).map((s) => ({
    name: s.name || "Subject",
    accuracy: Number(s.accuracy || 0),
  }));

  // Topic accuracy lists
  const topicList = (latestAttemptAnalytics?.topics || []).map((t) => ({
    name: t.name || "Topic",
    accuracy: Number(t.accuracy || 0),
    total: t.total || 0,
    correct: t.correct || 0,
  }));

  return (
    <div className="space-y-8 pb-12">
      <div className="border-b border-slate-800/60 pb-5">
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
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
