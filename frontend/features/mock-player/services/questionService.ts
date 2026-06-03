/**
 * Mock Player — Question Service
 *
 * RESPONSIBILITIES:
 *   1. Fetch the ordered question list for a mock test
 *   2. Fetch published question content for an exam
 *   3. Join them into ordered QuestionSlot[]
 *
 * ANTI-CHEAT ENFORCEMENT (architecture §18.2, §8.4):
 *   This is the PRIMARY stripping boundary for question data.
 *   - options[].is_correct   → STRIPPED (never returned)
 *   - question.explanation   → STRIPPED (never returned)
 *
 *   Stripping is implemented by explicit field selection, NOT destructuring.
 *   TypeScript enforces correctness: QuestionSlot and QuestionOption have no
 *   is_correct or explanation fields, so any accidental inclusion is a compile error.
 *
 * Backend → Frontend DTO mapping:
 *   GET /mock-tests/{id}/questions/ — MockTestQuestionRead
 *     question_id  → used as join key (not in output)
 *     position     → QuestionSlot.position
 *     section      → QuestionSlot.section
 *     marks        → DROPPED (not needed in player)
 *     id           → DROPPED (join-table UUID, not the question UUID)
 *     mock_test_id → DROPPED (implied by session context)
 *
 *   GET /questions/published/?exam_id=X — QuestionRead
 *     id           → QuestionSlot.id
 *     stem         → QuestionSlot.stem
 *     options      → QuestionSlot.options (each mapped via stripOption)
 *     explanation  → STRIPPED (anti-cheat)
 *     exam_id      → DROPPED (implied by session context)
 *     subtopic_id  → DROPPED (not needed in player)
 *     difficulty   → DROPPED (not displayed during attempt)
 *     language     → DROPPED (player uses stem as-is; i18n handled by backend)
 *     origin       → DROPPED (not needed in player)
 *     review_status → DROPPED (only published questions are fetched)
 *     verified_by_id → DROPPED
 *     tags         → DROPPED
 *     created_at   → DROPPED
 *     updated_at   → DROPPED
 *
 *   QuestionOptionNested (nested in QuestionRead)
 *     id           → QuestionOption.id
 *     label        → QuestionOption.label
 *     body         → QuestionOption.body
 *     position     → QuestionOption.position (defaults to 0 if absent)
 *     is_correct   → STRIPPED (anti-cheat)
 */

import { apiRequest } from '@/lib/api/client';
import type { components } from '@/lib/api/types';
import type { QuestionSlot, QuestionOption } from '../types';

// ─── Backend raw types (aliased for clarity) ──────────────────────────────────

type RawMockTestQuestion = components['schemas']['MockTestQuestionRead'];
type RawQuestion = components['schemas']['QuestionRead'];
type RawOption = components['schemas']['QuestionOptionNested'];

// ─── Custom error ─────────────────────────────────────────────────────────────

export class PlayerLoadError extends Error {
  constructor(
    public readonly reason:
      | 'mock_questions_failed'
      | 'published_questions_failed',
  ) {
    super(`Player load failed: ${reason}`);
    this.name = 'PlayerLoadError';
  }
}

// ─── Stripping helpers ────────────────────────────────────────────────────────

/**
 * Converts a raw backend option to QuestionOption.
 *
 * ANTI-CHEAT: Constructs the output by explicit field selection.
 * `is_correct` is NOT in QuestionOption — its absence is enforced by the type.
 */
function stripOption(raw: RawOption): QuestionOption {
  return {
    id: raw.id,
    label: raw.label,
    body: raw.body,
    // position is optional on RawOption; default to 0 if absent
    position: raw.position ?? 0,
    // is_correct: NOT included — anti-cheat boundary
  };
}

/**
 * Converts a raw backend question to QuestionSlot with ordering metadata.
 *
 * ANTI-CHEAT: Constructs the output by explicit field selection.
 * `explanation` is NOT in QuestionSlot — its absence is enforced by the type.
 */
function buildQuestionSlot(
  raw: RawQuestion,
  position: number,
  section: string | null,
): QuestionSlot {
  return {
    id: raw.id,
    position,
    section,
    stem: raw.stem,
    options: raw.options.map(stripOption),
    // explanation: NOT included — anti-cheat boundary
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Loads all questions for a mock-test-based attempt as an ordered QuestionSlot[].
 *
 * Two sequential fetches:
 *   A. GET /attempts/mock-tests/{mockTestId}/questions/
 *      → ordered join-table entries with position + section
 *   B. GET /questions/published/?exam_id={examId}
 *      → full question content (stem, options)
 *
 * Joined by question_id; sorted by position ASC.
 * Questions in mock_test_questions that have no match in published are skipped
 * with a warning (OQ-04: published questions may lag behind mock test config).
 *
 * @throws PlayerLoadError on network or API failure for either fetch.
 */
export async function loadPlayerQuestions(
  examId: string,
  mockTestId: string,
): Promise<QuestionSlot[]> {
  // Step 1: Fetch ordered question IDs + position + section for this mock test
  let mockTestQuestions: RawMockTestQuestion[];
  try {
    mockTestQuestions = await apiRequest<RawMockTestQuestion[]>(
      `/attempts/mock-tests/${mockTestId}/questions/`,
    );
  } catch {
    throw new PlayerLoadError('mock_questions_failed');
  }

  // Step 2: Fetch published question content for the exam
  let rawQuestions: RawQuestion[];
  try {
    rawQuestions = await apiRequest<RawQuestion[]>(
      `/questions/published/?exam_id=${examId}`,
    );
  } catch {
    throw new PlayerLoadError('published_questions_failed');
  }

  // Build lookup: question UUID → raw question content
  const questionContentMap = new Map<string, RawQuestion>(
    rawQuestions.map((q) => [q.id, q]),
  );

  // Step 3: Sort by position ASC (defensive; server should already order these)
  const sorted = [...mockTestQuestions].sort((a, b) => a.position - b.position);

  // Step 4: Join and build QuestionSlot[], stripping anti-cheat fields
  const slots: QuestionSlot[] = [];
  for (const mtq of sorted) {
    const raw = questionContentMap.get(mtq.question_id);
    if (raw === undefined) {
      // Published question pool may not include every question in the mock test
      // if a question was unpublished after the mock test was created.
      // Skip silently from the player's perspective; log for debugging.
      console.warn(
        `[questionService] question_id ${mtq.question_id} is in mock test ` +
          `but not in published list for exam ${examId}; skipping`,
      );
      continue;
    }
    slots.push(buildQuestionSlot(raw, mtq.position, mtq.section));
  }

  return slots;
}
