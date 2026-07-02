import React, { Suspense } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getDashboardServer } from "@/features/dashboard/dashboardService";
import { getExamDetailsServer, listAttemptsServer } from "@/features/practice/practiceService";
import { DiagnosticCard } from "@/features/diagnostic/DiagnosticCard";
import { readDiagnosticMockTestId } from "@/features/diagnostic/diagnosticGate";
import { getCurrentUser } from "@/features/auth/serverAuth";
import DashboardSkeleton from "@/features/dashboard/components/DashboardSkeleton";
import StatCard from "@/features/dashboard/components/StatCard";
import DailyPracticeCard from "@/features/dashboard/components/DailyPracticeCard";
import WeakTopicCard from "@/features/dashboard/components/WeakTopicCard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, ErrorState } from "@/components/ui";
import { Flame, BarChart3, HelpCircle, Target, BookOpen, AlertCircle, ArrowRight, Calendar, Compass, Award } from "lucide-react";

function getGreetingKey(hour: number): string {
  if (hour < 12) return "good_morning";
  if (hour < 17) return "good_afternoon";
  return "good_evening";
}

function calcDaysRemaining(examDate: string | null | undefined): number | null {
  if (!examDate) return null;
  const diff = Math.ceil(
    (new Date(examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return diff > 0 ? diff : 0;
}

async function DashboardContent() {
  const t = await getTranslations("dashboard");
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        {t("login_required")}
      </div>
    );
  }

  const targetExamId = user.target_exam_id || undefined;

  // Parallel: dashboard rollup + exam details (for name) + attempts (T13:
  // detect whether the student has launched any assessment yet).
  const [dashboardData, examDetail, attempts] = await Promise.all([
    getDashboardServer(targetExamId),
    targetExamId ? getExamDetailsServer(targetExamId) : Promise.resolve(null),
    targetExamId ? listAttemptsServer(targetExamId) : Promise.resolve(null),
  ]);

  // First-run diagnostic gate: a freshly-onboarded student has no attempts yet,
  // AND the exam must have a configured diagnostic mock test (SPR1-HOTFIX-02).
  const hasAttempts = (attempts ?? []).length > 0;
  const diagnosticMockTestId = readDiagnosticMockTestId(examDetail?.blueprint);

  const streak = dashboardData?.streak ?? 0;
  const dailyTarget = dashboardData?.daily_target ?? 10;
  const dailyAttempted = dashboardData?.daily_questions_attempted ?? 0;
  // overall_accuracy is null when the learner has no answered-question data.
  // Render an em-dash rather than a fabricated 0.00%/100% (SPRINT-5A-03).
  const overallAccuracy = dashboardData?.overall_accuracy ?? null;
  const accuracyDisplay = overallAccuracy === null ? "—" : `${overallAccuracy}%`;
  const weakTopics = dashboardData?.weak_topics ?? [];
  const recommendations = dashboardData?.recommendations ?? [];

  const currentHour = new Date().getHours();
  const greetingKey = getGreetingKey(currentHour);

  // Real countdown from user profile exam_date
  const daysRemaining = calcDaysRemaining(user.exam_date);
  const targetExamName = examDetail?.name ?? t("your_exam");

  return (
    <div className="space-y-8 pb-12">
      {/* ── SECTION 1: GREETING & COUNTDOWN ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
            {greetingKey === "good_morning" && t("good_morning", { name: user.full_name })}
            {greetingKey === "good_afternoon" && t("good_afternoon", { name: user.full_name })}
            {greetingKey === "good_evening" && t("good_evening", { name: user.full_name })}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("greeting_subtitle")}
          </p>
        </div>

        {/* Countdown Badge */}
        {user.target_exam_id && daysRemaining !== null ? (
          <div className="flex items-center gap-2.5 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-2 text-sm font-semibold text-blue-400">
            <Calendar className="h-4 w-4" />
            <span>{t("countdown", { days: daysRemaining, exam: targetExamName })}</span>
          </div>
        ) : user.target_exam_id ? (
          <div className="flex items-center gap-2.5 rounded-full border border-border bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{targetExamName}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-2 text-sm font-semibold text-amber-400">
            <AlertCircle className="h-4 w-4" />
            <span>{t("no_exam_selected")}</span>
          </div>
        )}
      </div>

      {/* A failed dashboard fetch (null) must not render as a fabricated all-zero
          dashboard — show the error state with Retry. A brand-new learner gets a
          real (zeroed) payload object, so this branch is reached only on failure. */}
      {user.target_exam_id && dashboardData === null ? (
        <ErrorState />
      ) : user.target_exam_id ? (
        <>
          {/* ── T13 / SPR1-HOTFIX-02: First diagnostic entry — only before any
                 attempt exists AND when a diagnostic mock test is configured. ── */}
          {!hasAttempts && diagnosticMockTestId && (
            <DiagnosticCard
              examId={user.target_exam_id}
              diagnosticMockTestId={diagnosticMockTestId}
            />
          )}

          {/* ── SECTION 2: STATS GRID ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title={t("streak")}
              value={`${streak} ${t("days_suffix")}`}
              description={t("streak_desc")}
              icon={Flame}
              iconColorClass="text-orange-500"
            />
            <StatCard
              title={t("accuracy")}
              value={accuracyDisplay}
              description={t("accuracy_desc")}
              icon={Target}
              iconColorClass="text-green-500"
            />
            <StatCard
              title={t("questions_attempted")}
              value={dailyAttempted}
              description={t("questions_attempted_desc")}
              icon={HelpCircle}
              iconColorClass="text-blue-500"
            />
            <StatCard
              title={t("daily_goal")}
              value={`${dailyAttempted}/${dailyTarget}`}
              description={t("daily_goal_desc", { current: dailyAttempted, target: dailyTarget })}
              icon={BookOpen}
              iconColorClass="text-indigo-500"
            />
          </div>

          {/* ── SECTION 3: DAILY PRACTICE CARD ── */}
          <div className="grid grid-cols-1 gap-6">
            {/* DailyPracticeCard is a client component — no function props needed */}
            <DailyPracticeCard />
          </div>

          {/* ── SECTION 4: WEAK TOPICS ── */}
          <div className="space-y-4">
            <div className="flex flex-col space-y-1">
              <h3 className="text-xl font-bold text-foreground tracking-tight">{t("weak_topics_title")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("weak_topics_subtitle")}
              </p>
            </div>

            {weakTopics.length === 0 ? (
              <Card className="border-border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground font-medium">
                  {t("positive_reinforcement")}
                </p>
              </Card>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-muted">
                {weakTopics.map((wt: any, idx: number) => (
                  <WeakTopicCard
                    key={wt.topic_id || idx}
                    topicName={wt.topic_name}
                    subjectName={wt.subject_name || t("syllabus_item")}
                    accuracy={wt.accuracy}
                    severity={wt.severity}
                    topicId={wt.topic_id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── SECTION 5: RECOMMENDATIONS ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border bg-card backdrop-blur-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Compass className="h-5 w-5 text-blue-400" />
                  {t("recommendations_title")}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {t("recommendations_subtitle")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recommendations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("no_recommendations")}
                  </p>
                ) : (
                  recommendations.map((rec: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border hover:border-border transition-colors"
                    >
                      <div className="space-y-0.5">
                        <h5 className="text-sm font-semibold text-foreground">
                          {t("revise_topic", { topic: rec.topic_name })}
                        </h5>
                        <p className="text-xs text-muted-foreground">
                          {t("revise_topic_desc")}
                        </p>
                      </div>
                      {/* Link replaces window.location.href onClick — safe in server component */}
                      <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300 hover:bg-accent" asChild>
                        <Link href={`/practice?topic=${rec.topic_id}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* ── SECTION 6: UPCOMING MOCKS ── */}
            <Card className="border-border bg-card backdrop-blur-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Award className="h-5 w-5 text-indigo-400" />
                  {t("upcoming_mocks_title")}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {t("upcoming_mocks_subtitle")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* /mocks route does not exist — link to practice where the mock tab lives */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
                  <div className="space-y-0.5">
                    <h5 className="text-sm font-semibold text-foreground">
                      {t("mock_full_length_title")}
                    </h5>
                    <p className="text-xs text-muted-foreground">
                      {t("mock_full_length_desc")}
                    </p>
                  </div>
                  <Button size="sm" className="bg-muted text-muted-foreground hover:bg-accent" asChild>
                    <Link href="/practice">{t("register_btn")}</Link>
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
                  <div className="space-y-0.5">
                    <h5 className="text-sm font-semibold text-foreground">
                      {t("mock_math_title")}
                    </h5>
                    <p className="text-xs text-muted-foreground">
                      {t("mock_math_desc")}
                    </p>
                  </div>
                  <Button size="sm" className="bg-muted text-muted-foreground hover:bg-accent" asChild>
                    <Link href="/practice">{t("register_btn")}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
