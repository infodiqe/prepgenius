"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createAttempt } from "@/features/attempts/attemptService";
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
      // API call to create attempt using frozen backend request schema
      const response = await createAttempt({
        exam_id: selectedExamId,
        attempt_type: launchParams.type,
        mock_test_id: (launchParams.type === "full_mock" || launchParams.type === "previous_year") ? launchParams.id : null,
        duration_seconds: launchParams.durationSeconds,
      });

      if (response && response.id) {
        // Close modal
        setRulesOpen(false);

        // Redirect based on type
        if (launchParams.type === "topic" && launchParams.id) {
          router.push(`/practice/${response.id}?topic_id=${launchParams.id}`);
        } else if (launchParams.type === "subject" && launchParams.id) {
          router.push(`/practice/${response.id}?subject_id=${launchParams.id}`);
        } else {
          router.push(`/practice/${response.id}`);
        }
      }
    } catch (err) {
      console.error("Failed to launch attempt:", err);
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
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          {t("title")}
        </h2>
        <p className="text-sm text-slate-400 mt-1.5">
          Browse practice modes, configure customized sessions, or attempt full-length mock exams.
        </p>
      </div>

      {/* Exam context selector */}
      <ExamSelector exams={exams} selectedExamId={selectedExamId} />

      {/* Resumable Active Attempt */}
      {activeAttempt && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
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
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Select Practice Mode
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
