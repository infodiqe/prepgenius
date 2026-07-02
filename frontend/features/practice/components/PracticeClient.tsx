"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  createAttempt,
  createPracticeAttempt,
  type PracticeScopeType,
} from "@/features/attempts/attemptService";
import { useErrorToast } from "@/features/feedback/useErrorToast";
import ExamSelector from "./ExamSelector";
import ResumeAttemptCard from "./ResumeAttemptCard";
import PracticeModeTabs from "./PracticeModeTabs";
import ExamRulesDialog from "./ExamRulesDialog";

interface ExamItem {
  id: string;
  code: string;
  name: string;
}

interface AttemptItem {
  id: string;
  mock_test_id: string | null;
  status: string;
  attempt_type: string;
  started_at: string | null;
  duration_seconds: number | null;
  updated_at: string;
}

interface MockTest {
  id: string;
  name: string;
  type: "system" | "previous_year" | "custom";
  duration_seconds: number;
  total_questions: number;
  is_published: boolean;
}

interface PracticeClientProps {
  exams: ExamItem[];
  selectedExamId: string;
  examTree: any;
  mockTests: MockTest[];
  attempts: AttemptItem[];
}

export default function PracticeClient({
  exams,
  selectedExamId,
  examTree,
  mockTests,
  attempts,
}: PracticeClientProps) {
  const t = useTranslations("practice");
  const router = useRouter();
  const notifyError = useErrorToast();

  // Find latest active attempt (created or in_progress status)
  const activeAttempt = attempts
    .filter((a) => a.status === "in_progress" || a.status === "created")
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];

  // Resolve mock test name for active attempt if it has one
  const activeAttemptMockName = activeAttempt?.mock_test_id
    ? mockTests.find((m) => m.id === activeAttempt.mock_test_id)?.name
    : undefined;

  // Rules Dialog State
  const [rulesOpen, setRulesOpen] = useState(false);
  const [launchParams, setLaunchParams] = useState<{
    type: "topic" | "subject" | "mixed" | "previous_year" | "full_mock";
    id?: string;
    name: string;
    durationSeconds: number;
    totalQuestions: number;
  } | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);

  const handleStartPractice = (
    type: "topic" | "subject" | "mixed" | "previous_year" | "full_mock",
    options: { id?: string; name?: string; durationSeconds?: number; totalQuestions?: number }
  ) => {
    setLaunchParams({
      type,
      id: options.id,
      name: options.name || "Practice Session",
      durationSeconds: options.durationSeconds || 900,
      totalQuestions: options.totalQuestions || 20,
    });
    setRulesOpen(true);
  };

  const handleConfirmLaunch = async () => {
    if (!launchParams) return;
    setIsLaunching(true);

    try {
      // T28: Topic/Subject/Mixed practice uses the server-authoritative practice
      // endpoint (generates a custom MockTest). Full mock / previous-year keep
      // the existing create-attempt path unchanged.
      const isPractice =
        launchParams.type === "topic" ||
        launchParams.type === "subject" ||
        launchParams.type === "mixed";

      const response = isPractice
        ? await createPracticeAttempt({
            exam_id: selectedExamId,
            scope_type: launchParams.type as PracticeScopeType,
            scope_id: launchParams.id ?? null,
          })
        : await createAttempt({
            exam_id: selectedExamId,
            attempt_type: launchParams.type,
            mock_test_id: launchParams.id ?? null,
            duration_seconds: launchParams.durationSeconds,
          });

      if (response && response.id) {
        setRulesOpen(false);
        // The attempt now always carries a mock_test_id (practice or mock), so
        // the player resolves the question set server-side — no scope query
        // params needed.
        router.push(`/practice/${response.id}`);
      }
    } catch (err) {
      notifyError(err);
    } finally {
      setIsLaunching(false);
    }
  };

  const handleResumeAttempt = (attemptId: string) => {
    router.push(`/practice/${attemptId}`);
  };

  return (
    <div className="space-y-8">
      {/* Title block */}
      <div>
        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
          {t("title")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          {t("practice_subtitle")}
        </p>
      </div>

      {/* Exam context selector */}
      <ExamSelector exams={exams} selectedExamId={selectedExamId} />

      {/* Resumable Active Attempt */}
      {activeAttempt && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("resume_section")}
          </h3>
          <ResumeAttemptCard
            attempt={activeAttempt}
            mockTestName={activeAttemptMockName}
            onResume={handleResumeAttempt}
          />
        </div>
      )}

      {/* Main selection tabs */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("select_practice_mode")}
        </h3>
        <PracticeModeTabs
          examTree={examTree}
          mockTests={mockTests}
          activeAttempts={attempts}
          onStartPractice={handleStartPractice}
        />
      </div>

      {/* Rules Confirmation Overlay */}
      {launchParams && (
        <ExamRulesDialog
          isOpen={rulesOpen}
          onClose={() => setRulesOpen(false)}
          onConfirm={handleConfirmLaunch}
          title={launchParams.name}
          durationSeconds={launchParams.durationSeconds}
          totalQuestions={launchParams.totalQuestions}
          isLoading={isLaunching}
        />
      )}
    </div>
  );
}
