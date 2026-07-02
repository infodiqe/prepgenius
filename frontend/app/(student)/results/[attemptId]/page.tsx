import React, { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import {
  getAttemptResultsServer,
  getAttemptAnalyticsServer,
  getAttemptDetailServer,
  getExamDetailsServer,
  getPublishedQuestionsServer,
} from "@/features/results/resultsService";
import ResultHero from "@/features/results/components/ResultHero";
import QuickStats from "@/features/results/components/QuickStats";
import SectionBreakdown from "@/features/results/components/SectionBreakdown";
import QuestionReviewAccordion from "@/features/results/components/QuestionReviewAccordion";
import EmptyResultState from "@/features/results/components/EmptyResultState";
import ResultSkeleton from "@/features/results/components/ResultSkeleton";
import { getCurrentUser } from "@/features/auth/serverAuth";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface ResultsPageProps {
  params: Promise<{
    attemptId: string;
  }>;
}

async function ResultContent({ attemptId }: { attemptId: string }) {
  const t = await getTranslations("results");
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        {t("login_required")}
      </div>
    );
  }

  // Fetch attempt metadata and result summaries in parallel on the server
  const [resultsData, analyticsData, attemptDetail] = await Promise.all([
    getAttemptResultsServer(attemptId),
    getAttemptAnalyticsServer(attemptId),
    getAttemptDetailServer(attemptId),
  ]);

  // A not-found or not-yet-scored attempt is a legitimate empty state. But a
  // scored attempt whose result summary failed to load is a backend failure —
  // show the error state with Retry rather than a misleading "no results".
  if (!attemptDetail || attemptDetail.status !== "scored") {
    return <EmptyResultState />;
  }

  if (!resultsData) {
    return <ErrorState />;
  }

  // Fetch Exam Details and Exam published questions in parallel
  const [examDetail, publishedQuestions] = await Promise.all([
    getExamDetailsServer(attemptDetail.exam_id),
    getPublishedQuestionsServer(attemptDetail.exam_id),
  ]);

  const passingCriteria = examDetail?.passing_criteria || {};
  const questions = publishedQuestions || [];

  // Map answers to their full published question details in-memory
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  const reviewItems = (attemptDetail.answers || []).map((ans) => {
    const qDetails = questionMap.get(ans.question_id);
    return {
      userAnswer: {
        id: ans.id ? String(ans.id) : "",
        question_id: ans.question_id || "",
        selected_option_id: ans.selected_option_id || null,
        is_correct: ans.is_correct || false,
        time_spent_seconds: ans.time_spent_seconds || 0,
      },
      question: qDetails
        ? {
            id: qDetails.id || "",
            stem: qDetails.stem || "",
            explanation: qDetails.explanation || null,
            difficulty: qDetails.difficulty || 2,
            options: (qDetails.options || []).map((o: any) => ({
              id: o.id || "",
              label: o.label || "",
              body: o.body || "",
              is_correct: o.is_correct || false,
              position: o.position || 0,
            })),
          }
        : {
            id: ans.question_id,
            stem: t("question_not_found"),
            explanation: null,
            difficulty: 2,
            options: [],
          },
    };
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Back button */}
      <div className="flex items-center justify-between border-b border-border pb-5">
        <Button
          asChild
          variant="ghost"
          className="text-muted-foreground hover:text-foreground flex items-center gap-2 px-0"
        >
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            <span>{t("back_dashboard")}</span>
          </Link>
        </Button>
        <h2 className="text-xl font-bold text-foreground tracking-tight">
          {t("title")}
        </h2>
      </div>

      {/* Hero section */}
      <ResultHero
        passStatus={resultsData.pass_status}
        score={resultsData.score ?? "0.00"}
        maxScore={resultsData.max_score ?? "0.00"}
        accuracy={resultsData.accuracy ?? "0.00"}
      />

      {/* Quick stats grid */}
      <QuickStats
        correct={resultsData.correct}
        incorrect={resultsData.incorrect}
        skipped={resultsData.skipped}
        timeTakenSeconds={resultsData.time_taken_seconds}
      />

      {/* Breakdown and Review */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <SectionBreakdown
            subjects={analyticsData?.subjects || []}
            passingCriteria={passingCriteria}
          />
        </div>

        <div className="lg:col-span-2">
          <QuestionReviewAccordion items={reviewItems} />
        </div>
      </div>
    </div>
  );
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { attemptId } = await params;

  return (
    <Suspense fallback={<ResultSkeleton />}>
      <ResultContent attemptId={attemptId} />
    </Suspense>
  );
}
