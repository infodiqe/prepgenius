/**
 * Mock Player — Reducer (pure state machine)
 *
 * CONTRACT:
 *   - Pure function: same inputs → same output, always.
 *   - No async code, no API calls, no IndexedDB writes, no side effects.
 *   - All state updates are immutable (new Maps, spread objects).
 *   - Date.now() is the only "impure" call used for lastModifiedAt timestamps.
 *     This is the standard practice for React reducers and keeps action
 *     payloads lean. Timestamps are for FIFO queue ordering only — correctness
 *     does not depend on their precision.
 *
 * ─── Question State Transition Table (architecture §4.3) ─────────────────────
 *
 *   Current State    │ Action          │ New State        │ selectedOptionId
 *   ─────────────────┼─────────────────┼──────────────────┼─────────────────
 *   not_visited      │ NAVIGATE_TO*    │ visited          │ null
 *   visited          │ SELECT_OPTION   │ answered         │ set
 *   visited          │ TOGGLE_MARK     │ marked           │ null
 *   answered         │ TOGGLE_MARK     │ answered_marked  │ preserved
 *   answered         │ CLEAR_RESPONSE  │ visited          │ null
 *   answered_marked  │ TOGGLE_MARK     │ answered         │ preserved
 *   answered_marked  │ CLEAR_RESPONSE  │ marked           │ null
 *   marked           │ SELECT_OPTION   │ answered_marked  │ set
 *   marked           │ TOGGLE_MARK     │ visited          │ null
 *   not_visited      │ TOGGLE_MARK     │ marked           │ null (edge case)
 *
 *   * NAVIGATE_TO transitions the question being navigated AWAY from,
 *     not the destination. Transition happens before updating currentIndex.
 *
 * ─── Save Status Transition Table (architecture §5.2) ────────────────────────
 *
 *   Trigger                          │ New SaveStatus
 *   ─────────────────────────────────┼────────────────
 *   User interaction                 │ saving     (dispatched by useSaveAnswer)
 *   200 OK from server               │ saved      (dispatched by useSaveAnswer)
 *   saved after 3 s                  │ idle       (dispatched by useSaveAnswer)
 *   navigator.onLine = false         │ queued     (dispatched by QUEUE_OFFLINE)
 *   queue flushed successfully       │ saved      (dispatched by useOfflineQueue)
 *   all retries exhausted            │ failed     (dispatched by useSaveAnswer)
 *
 * ─── Reducer Action Matrix ────────────────────────────────────────────────────
 *
 *   Action            │ State fields changed
 *   ──────────────────┼──────────────────────────────────────────────────────
 *   LOAD_SESSION      │ attemptId, examId, mockTestId, attemptType,
 *                     │ attemptStatus, startedAt, durationSeconds,
 *                     │ questionCount, questions, answers, currentIndex
 *   NAVIGATE_TO       │ currentIndex; answers[currentQ].state (not_visited→visited)
 *   SELECT_OPTION     │ answers[q].{selectedOptionId, state, dirty, lastModifiedAt}
 *   TOGGLE_MARK       │ answers[q].{state, dirty, lastModifiedAt}
 *   CLEAR_RESPONSE    │ answers[q].{selectedOptionId, state, dirty, lastModifiedAt}
 *   ACK_SAVE          │ answers[q].dirty = false
 *   QUEUE_OFFLINE     │ saveStatus = 'queued', offlineQueueSize++
 *   FLUSH_QUEUE       │ offlineQueueSize = 0
 *   SET_SAVE_STATUS   │ saveStatus
 *   SET_REMAINING     │ remainingSeconds, timerExpired
 *   EXPIRE_TIMER      │ timerExpired = true, remainingSeconds = 0
 *   OPEN_PALETTE      │ paletteOpen = true
 *   CLOSE_PALETTE     │ paletteOpen = false
 *   OPEN_SUBMIT       │ submitDialogOpen = true
 *   CLOSE_SUBMIT      │ submitDialogOpen = false
 *   START_SUBMITTING  │ isSubmitting = true
 *   END_SUBMITTING    │ isSubmitting = false
 *   SET_QUEUE_SIZE    │ offlineQueueSize
 */

import type {
  PlayerState,
  PlayerAction,
  LocalAnswer,
  QuestionState,
} from './types';

// ─── Initial State ────────────────────────────────────────────────────────────

/**
 * The state before LOAD_SESSION is dispatched.
 * All fields are in their zero/empty/false defaults.
 * The shell dispatches LOAD_SESSION immediately on mount; no component
 * should render question content from this initial state.
 */
export const initialPlayerState: PlayerState = {
  attemptId: '',
  examId: '',
  mockTestId: null,
  attemptType: 'full_mock',
  attemptStatus: 'created',
  durationSeconds: 0,
  startedAt: '',
  questionCount: 0,
  questions: [],
  currentIndex: 0,
  answers: new Map<string, LocalAnswer>(),
  saveStatus: 'idle',
  paletteOpen: false,
  submitDialogOpen: false,
  isSubmitting: false,
  offlineQueueSize: 0,
  remainingSeconds: 0,
  timerExpired: false,
};

// ─── Exhaustiveness helper ────────────────────────────────────────────────────

/**
 * TypeScript exhaustiveness guard. If any action type is missing from the
 * switch, TypeScript will report an error on this function call because
 * `value` will not be `never` in the default branch.
 */
function assertNever(value: never): never {
  throw new Error(`Unhandled player action: ${JSON.stringify(value)}`);
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

export function playerReducer(
  state: PlayerState,
  action: PlayerAction,
): PlayerState {
  switch (action.type) {
    // ── Session hydration ───────────────────────────────────────────────────

    case 'LOAD_SESSION': {
      const p = action.payload;
      return {
        ...state,
        attemptId: p.attemptId,
        examId: p.examId,
        mockTestId: p.mockTestId,
        attemptType: p.attemptType,
        attemptStatus: p.attemptStatus,
        startedAt: p.startedAt,
        durationSeconds: p.durationSeconds,
        // questionCount is always questions.length — never attempt.total_questions
        questionCount: p.questions.length,
        questions: p.questions,
        answers: p.answers,
        currentIndex: p.currentIndex,
      };
    }

    // ── Navigation ──────────────────────────────────────────────────────────

    case 'NAVIGATE_TO': {
      const { index } = action.payload;
      const fromQuestion = state.questions[state.currentIndex];
      const toQuestion = state.questions[index];

      // Lazy Map copy: only created if at least one transition fires.
      let newAnswers: Map<string, LocalAnswer> | null = null;
      const getMap = () => {
        if (newAnswers === null) newAnswers = new Map(state.answers);
        return newAnswers;
      };

      // ── Transition the question being navigated AWAY FROM ─────────────────
      //   not_visited → visited (records that the student saw this question)
      if (fromQuestion !== undefined) {
        const fromAnswer = state.answers.get(fromQuestion.id);
        if (fromAnswer === undefined || fromAnswer.state === 'not_visited') {
          getMap().set(fromQuestion.id, {
            questionId: fromQuestion.id,
            selectedOptionId: fromAnswer?.selectedOptionId ?? null,
            state: 'visited',
            timeSpentSeconds: fromAnswer?.timeSpentSeconds ?? 0,
            dirty: true,
            lastModifiedAt: Date.now(),
          });
        }
      }

      // ── QA FIX: also mark the DESTINATION question as visited ─────────────
      //   Architecture §4.3: "navigate to question → visited"
      //   The previous implementation only transitioned the FROM question, so
      //   the destination remained not_visited while the student was viewing it.
      //   Only applies when navigating to a DIFFERENT question.
      if (toQuestion !== undefined && index !== state.currentIndex) {
        const toAnswer = state.answers.get(toQuestion.id);
        if (toAnswer === undefined || toAnswer.state === 'not_visited') {
          getMap().set(toQuestion.id, {
            questionId: toQuestion.id,
            selectedOptionId: toAnswer?.selectedOptionId ?? null,
            state: 'visited',
            timeSpentSeconds: toAnswer?.timeSpentSeconds ?? 0,
            dirty: true,
            lastModifiedAt: Date.now(),
          });
        }
      }

      if (newAnswers !== null) {
        return { ...state, currentIndex: index, answers: newAnswers };
      }
      return { ...state, currentIndex: index };
    }

    // ── Answer interaction ───────────────────────────────────────────────────

    case 'SELECT_OPTION': {
      const { questionId, optionId } = action.payload;
      const existing = state.answers.get(questionId);

      // Architecture §4.3:
      //   marked + select  → answered_marked  (keep flag, add answer)
      //   anything + select → answered
      const newState: QuestionState =
        existing?.state === 'marked' ? 'answered_marked' : 'answered';

      const updated: LocalAnswer = {
        questionId,
        selectedOptionId: optionId,
        state: newState,
        timeSpentSeconds: existing?.timeSpentSeconds ?? 0,
        dirty: true,
        lastModifiedAt: Date.now(),
      };

      const newAnswers = new Map(state.answers);
      newAnswers.set(questionId, updated);
      return { ...state, answers: newAnswers };
    }

    case 'TOGGLE_MARK': {
      const { questionId } = action.payload;
      const existing = state.answers.get(questionId);
      const currentState: QuestionState = existing?.state ?? 'not_visited';

      // Architecture §4.3 toggle transitions:
      const stateAfterToggle: QuestionState = (
        {
          answered: 'answered_marked',
          answered_marked: 'answered',
          visited: 'marked',
          marked: 'visited',
          not_visited: 'marked', // edge case: mark without first visiting
        } as Record<QuestionState, QuestionState>
      )[currentState];

      const updated: LocalAnswer = {
        questionId,
        selectedOptionId: existing?.selectedOptionId ?? null,
        state: stateAfterToggle,
        timeSpentSeconds: existing?.timeSpentSeconds ?? 0,
        dirty: true,
        lastModifiedAt: Date.now(),
      };

      const newAnswers = new Map(state.answers);
      newAnswers.set(questionId, updated);
      return { ...state, answers: newAnswers };
    }

    case 'CLEAR_RESPONSE': {
      const { questionId } = action.payload;
      const existing = state.answers.get(questionId);

      // No-op if no existing answer or in a state that can't be cleared
      if (existing === undefined) return state;
      if (
        existing.state !== 'answered' &&
        existing.state !== 'answered_marked'
      ) {
        return state;
      }

      // Architecture §4.3:
      //   answered         + clear → visited   (remove answer, no flag)
      //   answered_marked  + clear → marked    (remove answer, keep flag)
      const newState: QuestionState =
        existing.state === 'answered' ? 'visited' : 'marked';

      const updated: LocalAnswer = {
        ...existing,
        selectedOptionId: null,
        state: newState,
        dirty: true,
        lastModifiedAt: Date.now(),
      };

      const newAnswers = new Map(state.answers);
      newAnswers.set(questionId, updated);
      return { ...state, answers: newAnswers };
    }

    // ── Save acknowledgement ─────────────────────────────────────────────────

    case 'ACK_SAVE': {
      const { questionId } = action.payload;
      const existing = state.answers.get(questionId);
      if (existing === undefined) return state;

      const newAnswers = new Map(state.answers);
      newAnswers.set(questionId, { ...existing, dirty: false });
      return { ...state, answers: newAnswers };
    }

    // ── Offline queue ────────────────────────────────────────────────────────

    case 'QUEUE_OFFLINE': {
      return {
        ...state,
        saveStatus: 'queued',
        offlineQueueSize: state.offlineQueueSize + 1,
      };
    }

    case 'FLUSH_QUEUE': {
      return { ...state, offlineQueueSize: 0 };
    }

    // ── Save status ──────────────────────────────────────────────────────────

    case 'SET_SAVE_STATUS': {
      return { ...state, saveStatus: action.payload.status };
    }

    // ── Timer ────────────────────────────────────────────────────────────────

    case 'SET_REMAINING': {
      const { seconds } = action.payload;
      return {
        ...state,
        remainingSeconds: seconds,
        timerExpired: seconds <= 0,
      };
    }

    case 'EXPIRE_TIMER': {
      return { ...state, timerExpired: true, remainingSeconds: 0 };
    }

    // ── UI toggles ───────────────────────────────────────────────────────────

    case 'OPEN_PALETTE':  return { ...state, paletteOpen: true };
    case 'CLOSE_PALETTE': return { ...state, paletteOpen: false };
    case 'OPEN_SUBMIT':   return { ...state, submitDialogOpen: true };
    case 'CLOSE_SUBMIT':  return { ...state, submitDialogOpen: false };

    // ── Submit lifecycle ─────────────────────────────────────────────────────

    case 'START_SUBMITTING': return { ...state, isSubmitting: true };
    case 'END_SUBMITTING':   return { ...state, isSubmitting: false };

    // ── Queue size ───────────────────────────────────────────────────────────

    case 'SET_QUEUE_SIZE': {
      return { ...state, offlineQueueSize: action.payload.size };
    }

    // ── Time tracking ────────────────────────────────────────────────────────

    case 'TICK_TIME': {
      const { questionId } = action.payload;
      const existing = state.answers.get(questionId);
      // Guard: no-op if the question has no local answer record yet
      if (existing === undefined) return state;

      const newAnswers = new Map(state.answers);
      newAnswers.set(questionId, {
        ...existing,
        timeSpentSeconds: existing.timeSpentSeconds + 1,
        // dirty is intentionally NOT set: time increments are piggy-backed
        // onto the next answer-save rather than triggering standalone saves.
      });
      return { ...state, answers: newAnswers };
    }

    // ── Exhaustiveness guard ─────────────────────────────────────────────────

    default:
      return assertNever(action);
  }
}
