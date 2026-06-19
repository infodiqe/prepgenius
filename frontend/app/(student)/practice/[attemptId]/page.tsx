/**
 * Mock Player entry point — Server Component.
 *
 * Handles authentication, attempt loading, status routing, and anti-cheat
 * stripping before handing off to MockPlayerShell (the Client Component).
 *
 * ─── Attempt Status → Route Behavior ──────────────────────────────────────────
 *
 *   Status         │ Action
 *   ───────────────┼──────────────────────────────────────────────────────────
 *   (no user)      │ redirect('/login?next=/practice/{id}')
 *   (not found)    │ render 404-style error UI
 *   'scored'       │ redirect('/results/{id}')
 *   'submitted'    │ render "scoring in progress" state — polling is client-side
 *                  │ (auto-score failed edge case; the shell initiates a retry)
 *   'created'      │ render MockPlayerShell — shell calls POST /start/ on mount
 *   'in_progress'  │ render MockPlayerShell — timer anchor available immediately
 *   null mockTestId│ render "practice types not yet supported" state (MVP scope)
 *
 * ─── Anti-Cheat Stripping ─────────────────────────────────────────────────────
 *
 *   getAttemptDetailServer returns ScoredAttemptDetail which includes
 *   answers[].is_correct. This field is stripped here before being passed
 *   to MockPlayerShell. The StrippedAnswerForPlayer type enforces this at the
 *   call site. See architecture §18.2.
 */

import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/features/auth/serverAuth';
import { getAttemptDetailServer } from '@/features/attempts/attemptServerService';
import { MockPlayerShell } from '@/features/mock-player/MockPlayerShell';
import { resolveCompletionHref } from '@/features/mock-player/completionHref';
import type { components } from '@/lib/api/types';
import type { AttemptType, AttemptStatus } from '@/features/mock-player/types';

interface PageProps {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// ─── Anti-cheat type: is_correct removed from each answer ─────────────────────

type RawAnswer = components['schemas']['UserAnswerRead'];
type StrippedAnswerForPlayer = Omit<RawAnswer, 'is_correct'>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripIsCorrect(answers: readonly RawAnswer[]): StrippedAnswerForPlayer[] {
  return answers.map(
    (ans): StrippedAnswerForPlayer => ({
      id: ans.id,
      attempt_id: ans.attempt_id,
      question_id: ans.question_id,
      selected_option_id: ans.selected_option_id,
      state: ans.state,
      time_spent_seconds: ans.time_spent_seconds,
      answered_at: ans.answered_at,
      created_at: ans.created_at,
      // is_correct: intentionally omitted — anti-cheat boundary (architecture §18.2)
    }),
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PracticeAttemptPage({ params, searchParams }: PageProps) {
  const { attemptId } = await params;

  // SPR1-HOTFIX-02: the diagnostic flow finalises on the diagnostic completion
  // screen rather than the generic results page. Everything else is unchanged.
  const { flow } = await searchParams;
  const completionHref = resolveCompletionHref(attemptId, flow);

  // ── Auth check ──────────────────────────────────────────────────────────────
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=/practice/${attemptId}`);
  }

  // ── Load attempt ─────────────────────────────────────────────────────────────
  const attempt = await getAttemptDetailServer(attemptId);

  if (!attempt) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-6 bg-white text-slate-800 px-4">
        <h2 className="text-xl font-bold">Session Not Found</h2>
        <p className="text-sm text-slate-500 text-center max-w-sm">
          This practice session does not exist or you do not have access to it.
        </p>
        <Link
          href="/practice"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          Back to Practice
        </Link>
      </div>
    );
  }

  // ── Status routing ──────────────────────────────────────────────────────────

  if (attempt.status === 'scored') {
    redirect(completionHref);
  }

  // 'submitted' = auto-score failed (extremely rare with hotfix).
  // Redirect to the completion destination; both the results and diagnostic
  // screens handle the pending/scored state.
  if (attempt.status === 'submitted') {
    redirect(completionHref);
  }

  // ── MVP scope check ─────────────────────────────────────────────────────────
  // Practice types (topic/subject/mixed) have no mock_test_id; OQ-03 not resolved.

  if (!attempt.mock_test_id) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-6 bg-white text-slate-800 px-4">
        <h2 className="text-xl font-bold">Practice Mode Coming Soon</h2>
        <p className="text-sm text-slate-500 text-center max-w-sm">
          The interactive player currently supports Full Mock and Previous Year
          attempt types only. Practice mode (topic, subject, mixed) will be
          available in the next sprint.
        </p>
        <Link
          href="/practice"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          Back to Practice
        </Link>
      </div>
    );
  }

  // ── Strip anti-cheat fields before crossing server → client boundary ────────

  const existingAnswers = stripIsCorrect(attempt.answers);

  // ── Render player ───────────────────────────────────────────────────────────
  // status is 'created' or 'in_progress' at this point.

  return (
    <MockPlayerShell
      attemptId={attempt.id}
      examId={attempt.exam_id}
      mockTestId={attempt.mock_test_id}
      attemptType={attempt.attempt_type as AttemptType}
      attemptStatus={attempt.status as AttemptStatus}
      startedAt={attempt.started_at ?? null}
      durationSeconds={attempt.duration_seconds ?? null}
      existingAnswers={existingAnswers}
      completionHref={completionHref}
    />
  );
}
