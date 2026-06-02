import React from "react";
import { getExamsListServer, getExamTreeServer, getMockTestsServer, listAttemptsServer } from "@/features/practice/practiceService";
import PracticeClient from "@/features/practice/components/PracticeClient";
import EmptyPracticeState from "@/features/practice/components/EmptyPracticeState";

interface PageProps {
  searchParams: Promise<{
    examId?: string;
    topic?: string;
  }>;
}

export default async function PracticePage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  
  // 1. Fetch the list of exams
  const exams = await getExamsListServer();
  
  if (!exams || exams.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[50vh]">
        <EmptyPracticeState
          title="No Exams Available"
          description="There are no active target exams configured on the platform at the moment. Please contact support or check back later."
        />
      </div>
    );
  }

  // 2. Resolve target exam ID
  const selectedExamId = resolvedParams.examId || exams[0].id;
  const targetExam = exams.find((e) => e.id === selectedExamId) || exams[0];

  // 3. Parallel fetch of exam details: syllabus tree, mock tests, attempts history
  const [examTree, mockTests, attempts] = await Promise.all([
    getExamTreeServer(targetExam.id),
    getMockTestsServer(targetExam.id),
    listAttemptsServer(targetExam.id),
  ]);

  // Map backend models/keys to ensure strict type safety with frontend types
  const safeExams = exams.map((e) => ({
    id: e.id,
    code: e.code,
    name: e.name,
  }));

  const safeMockTests = (mockTests || []).map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type,
    duration_seconds: t.duration_seconds,
    total_questions: t.total_questions,
    is_published: t.is_published,
  }));

  const safeAttempts = (attempts || []).map((a) => ({
    id: a.id,
    mock_test_id: a.mock_test_id,
    status: a.status,
    attempt_type: a.attempt_type,
    started_at: a.started_at,
    duration_seconds: a.duration_seconds,
    updated_at: a.updated_at,
  }));

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <PracticeClient
        exams={safeExams}
        selectedExamId={targetExam.id}
        examTree={examTree}
        mockTests={safeMockTests}
        attempts={safeAttempts}
      />
    </main>
  );
}
