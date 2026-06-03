/**
 * Mock Player — canonical TypeScript types.
 *
 * ANTI-CHEAT INVARIANT (architecture §18.2, §8.4):
 *   - QuestionOption  MUST NOT contain is_correct
 *   - QuestionSlot    MUST NOT contain is_correct or explanation
 *   - LocalAnswer     MUST NOT contain is_correct
 *
 * The backend returns these fields on its API responses. The service layer
 * (services/questionService.ts, services/answerService.ts) strips them before
 * any data reaches React state, TanStack Query cache, or IndexedDB. The types
 * below enforce this at the TypeScript level — adding those fields here is a
 * compile error in every consumer.
 */

// ─── Core Domain Enums ────────────────────────────────────────────────────────

/**
 * Five canonical question states defined in user_answers.state (DB schema).
 * These are the ONLY valid states. No additional states may be invented.
 * Architecture §4.1 is the authoritative reference.
 */
export type QuestionState =
  | 'not_visited'
  | 'visited'
  | 'answered'
  | 'marked'
  | 'answered_marked';

/**
 * Save-status states for the autosave indicator (architecture §5.1).
 */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'queued' | 'failed';

/**
 * Attempt lifecycle status values — mirrors backend Status3c9Enum.
 */
export type AttemptStatus = 'created' | 'in_progress' | 'submitted' | 'scored';

/**
 * Attempt type values — mirrors backend AttemptTypeAf7Enum.
 * MVP scope: full_mock and previous_year only.
 */
export type AttemptType =
  | 'topic'
  | 'subject'
  | 'mixed'
  | 'previous_year'
  | 'full_mock'
  | 'daily';

// ─── Question Types ───────────────────────────────────────────────────────────

/**
 * A single answer option as presented to the player.
 *
 * ANTI-CHEAT: is_correct is deliberately absent. The backend QuestionOptionNested
 * type includes it; the service layer strips it before populating this type.
 */
export interface QuestionOption {
  id: string;       // option UUID
  label: string;    // 'A', 'B', 'C', 'D'
  body: string;     // option text (plain; never dangerouslySetInnerHTML)
  position: number; // 1-based display order
}

/**
 * A question as presented to the player.
 *
 * ANTI-CHEAT: is_correct and explanation are deliberately absent. The backend
 * QuestionRead type includes both; the service layer (questionService.ts) strips
 * them before writing to TanStack Query cache or passing to this type.
 */
export interface QuestionSlot {
  id: string;                // question UUID
  position: number;          // 1-based ordinal from mock_test_questions.position
  section: string | null;    // e.g. "CDP", "Science", "English"; null for practice
  stem: string;              // question text
  options: QuestionOption[]; // exactly 4 options for MCQ (MVP)
}

// ─── Answer State ─────────────────────────────────────────────────────────────

/**
 * Per-question client answer state.
 *
 * ANTI-CHEAT: is_correct is deliberately absent. The backend UserAnswerRead
 * type includes is_correct; the service layer (answerService.ts) strips it
 * before writing to this type or React state.
 */
export interface LocalAnswer {
  questionId: string;
  selectedOptionId: string | null; // null = cleared / not answered
  state: QuestionState;
  timeSpentSeconds: number;        // accumulated; sent to server on save
  dirty: boolean;                  // true = not yet server-acknowledged
  lastModifiedAt: number;          // Unix ms; used for FIFO queue ordering
}

// ─── Player State ─────────────────────────────────────────────────────────────

/**
 * Complete player state managed by useReducer(playerReducer, initialState).
 * Architecture §3.1 is the authoritative reference.
 */
export interface PlayerState {
  // Attempt metadata (server-authoritative; set once on LOAD_SESSION)
  attemptId: string;
  examId: string;
  mockTestId: string | null;
  attemptType: AttemptType;
  attemptStatus: AttemptStatus;
  durationSeconds: number;
  startedAt: string;  // ISO UTC from server; the timer anchor — never overridden

  // Question list
  questionCount: number;          // always === questions.length; NEVER attempt.total_questions
  questions: QuestionSlot[];
  currentIndex: number;           // 0-based pointer into questions[]

  // Answer map: questionId → LocalAnswer
  answers: Map<string, LocalAnswer>;

  // UI state (ephemeral; never persisted)
  saveStatus: SaveStatus;
  paletteOpen: boolean;
  submitDialogOpen: boolean;
  isSubmitting: boolean;
  offlineQueueSize: number;       // number of answers pending flush

  // Timer — derived from startedAt + durationSeconds; updated by 1s interval
  remainingSeconds: number;       // never persisted; recomputed on every resume
  timerExpired: boolean;          // true when remainingSeconds <= 0
}

// ─── LOAD_SESSION Payload ─────────────────────────────────────────────────────

/**
 * Payload for the LOAD_SESSION action.
 * Carries all server + IndexedDB state needed to hydrate the player on mount/resume.
 */
export interface LoadSessionPayload {
  attemptId: string;
  examId: string;
  mockTestId: string | null;
  attemptType: AttemptType;
  attemptStatus: AttemptStatus;
  startedAt: string;
  durationSeconds: number;
  questions: QuestionSlot[];
  answers: Map<string, LocalAnswer>;
  currentIndex: number;
}

// ─── Player Actions ───────────────────────────────────────────────────────────

/**
 * Discriminated union of every action the player reducer handles.
 * The reducer is a pure function — no side effects, no API calls.
 * Architecture §2.1 of the implementation plan.
 */
export type PlayerAction =
  | {
      type: 'LOAD_SESSION';
      payload: LoadSessionPayload;
    }
  | {
      type: 'NAVIGATE_TO';
      payload: { index: number };
    }
  | {
      type: 'SELECT_OPTION';
      payload: { questionId: string; optionId: string };
    }
  | {
      type: 'TOGGLE_MARK';
      payload: { questionId: string };
    }
  | {
      type: 'CLEAR_RESPONSE';
      payload: { questionId: string };
    }
  | {
      type: 'ACK_SAVE';
      payload: { questionId: string };
    }
  | {
      type: 'QUEUE_OFFLINE';
    }
  | {
      type: 'FLUSH_QUEUE';
    }
  | {
      type: 'SET_SAVE_STATUS';
      payload: { status: SaveStatus };
    }
  | {
      type: 'SET_REMAINING';
      payload: { seconds: number };
    }
  | {
      type: 'EXPIRE_TIMER';
    }
  | {
      type: 'OPEN_PALETTE';
    }
  | {
      type: 'CLOSE_PALETTE';
    }
  | {
      type: 'OPEN_SUBMIT';
    }
  | {
      type: 'CLOSE_SUBMIT';
    }
  | {
      type: 'START_SUBMITTING';
    }
  | {
      type: 'END_SUBMITTING';
    }
  | {
      type: 'SET_QUEUE_SIZE';
      payload: { size: number };
    }
  | {
      /**
       * Increments timeSpentSeconds for a question by 1 second.
       * Dispatched by a setInterval in MockPlayerShell — one tick per second
       * for the currently displayed question.
       * Does NOT set dirty=true: time is piggy-backed on the next answer-save
       * rather than triggering a standalone save every second.
       */
      type: 'TICK_TIME';
      payload: { questionId: string };
    };
