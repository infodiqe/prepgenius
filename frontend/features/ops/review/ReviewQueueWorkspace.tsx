"use client";

import React from "react";
import {
  listExams,
  listQuestions,
  getExamTree,
  buildExamNameIndex,
  buildSubtopicIndex,
  type ContentExam,
  type ContentExamTree,
  type ContentQuestion,
  type ContentReviewStatus,
  type SubtopicLabel,
} from "../content/contentService";
import {
  REVIEW_COLUMNS,
  claimQuestion,
  releaseQuestion,
  approveQuestion,
  rejectQuestion,
  escalateQuestion,
  type ReviewColumnKey,
} from "./reviewQueueService";
import { ReviewFilters } from "./ReviewFilters";
import { ReviewQueueBoard, type BoardColumnState } from "./ReviewQueueBoard";
import { ReviewDetailDrawer } from "./ReviewDetailDrawer";
import type { ColumnPhase } from "./ReviewQueueColumn";

/**
 * ReviewQueueWorkspace — OPS-03 / OPS-STAB-01 orchestrator.
 *
 * Fetches each status-backed column from the server (`review_status` filter),
 * resolves display labels, and wires the five review actions. The backend
 * enforces the state machine + RBAC and remains the source of truth.
 *
 * REVIEWER-IN-FLOW (OPS-STAB-01 §3.1): a successful *decision* (approve / reject
 * / escalate) optimistically removes the processed card from its column, keeps
 * the drawer open, and auto-advances to the next card, then reconciles with a
 * SILENT background refetch (no skeleton flash, no full reset). A FAILED action
 * mutates nothing (the server is authoritative; the drawer surfaces the error).
 * Ownership actions (claim / release) keep the current card and refresh.
 *
 * Claim-ownership columns ("My Queue"/"Unclaimed") remain "awaiting backend
 * support". English-only.
 */
interface ColState {
  phase: ColumnPhase;
  questions: ContentQuestion[];
}

const STATUS_COLUMNS = REVIEW_COLUMNS.filter((c) => c.reviewStatus);

/** Flat, board-ordered list of loaded questions (status columns only). */
function flatList(data: Record<ReviewColumnKey, ColState>): ContentQuestion[] {
  return STATUS_COLUMNS.flatMap((col) => data[col.key].questions);
}

/** A copy of `data` with the given question id removed from every column. */
function removeFromData(
  data: Record<ReviewColumnKey, ColState>,
  id: string,
): Record<ReviewColumnKey, ColState> {
  const next = { ...data };
  for (const col of STATUS_COLUMNS) {
    const cur = next[col.key];
    next[col.key] = {
      ...cur,
      questions: cur.questions.filter((q) => q.id !== id),
    };
  }
  return next;
}

function initialColState(): Record<ReviewColumnKey, ColState> {
  const state = {} as Record<ReviewColumnKey, ColState>;
  for (const col of REVIEW_COLUMNS) {
    state[col.key] = { phase: "loading", questions: [] };
  }
  return state;
}

export function ReviewQueueWorkspace() {
  const [exams, setExams] = React.useState<ContentExam[]>([]);
  const [examNameIndex, setExamNameIndex] = React.useState<
    Record<string, string>
  >({});
  const [subtopicIndex, setSubtopicIndex] = React.useState<
    Record<string, SubtopicLabel>
  >({});
  const [examId, setExamId] = React.useState("");
  const [data, setData] = React.useState<Record<ReviewColumnKey, ColState>>(
    initialColState,
  );

  const [drawerQuestion, setDrawerQuestion] =
    React.useState<ContentQuestion | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    listExams()
      .then((list) => {
        if (!active) return;
        setExams(list);
        setExamNameIndex(buildExamNameIndex(list));
      })
      .catch(() => {
        /* non-fatal: columns still surface their own error state */
      });
    return () => {
      active = false;
    };
  }, []);

  // `silent` reconciles in the background without flashing column skeletons —
  // used after an in-flow action so the reviewer never sees a full reset.
  const load = React.useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setData((prev) => {
        const next = { ...prev };
        for (const col of STATUS_COLUMNS) {
          next[col.key] = { phase: "loading", questions: [] };
        }
        return next;
      });
    }

    const results = await Promise.allSettled(
      STATUS_COLUMNS.map((col) =>
        listQuestions({
          examId: examId || undefined,
          reviewStatus: col.reviewStatus as ContentReviewStatus,
        }),
      ),
    );

    const nextState: Partial<Record<ReviewColumnKey, ColState>> = {};
    const allQuestions: ContentQuestion[] = [];
    STATUS_COLUMNS.forEach((col, i) => {
      const r = results[i];
      if (r.status === "fulfilled") {
        nextState[col.key] = { phase: "ready", questions: r.value };
        allQuestions.push(...r.value);
      } else if (!opts?.silent) {
        // On a silent reconcile, keep the column's current data on failure
        // rather than wiping it to an error state under the reviewer.
        nextState[col.key] = { phase: "error", questions: [] };
      }
    });

    // Resolve subject/topic names: one tree per distinct exam in the results.
    const examIds = Array.from(
      new Set(
        [examId, ...allQuestions.map((q) => q.exam_id)].filter(
          (id): id is string => Boolean(id),
        ),
      ),
    );
    const trees = await Promise.all(
      examIds.map((id) => getExamTree(id).catch(() => null)),
    );
    const resolved: ContentExamTree[] = trees.filter(
      (t): t is ContentExamTree => t !== null,
    );

    setSubtopicIndex(buildSubtopicIndex(resolved));
    setData((prev) => ({ ...prev, ...nextState }));
  }, [examId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const openDrawer = React.useCallback((question: ContentQuestion) => {
    setDrawerQuestion(question);
    setDrawerOpen(true);
  }, []);

  // A DECISION succeeded: drop the processed card, advance to the next card in
  // board order (keep the drawer open), then reconcile silently. Runs only after
  // the server confirmed the transition, so a failure never reaches here.
  const advancePastDecided = React.useCallback(
    (id: string) => {
      const oldFlat = flatList(data);
      const idx = oldFlat.findIndex((q) => q.id === id);
      const next = removeFromData(data, id);
      const newFlat = flatList(next);
      setData(next);
      if (newFlat.length === 0) {
        setDrawerOpen(false);
        setDrawerQuestion(null);
      } else {
        const target =
          newFlat[
            Math.min(idx < 0 ? newFlat.length - 1 : idx, newFlat.length - 1)
          ];
        setDrawerQuestion(target ?? null);
      }
      void load({ silent: true });
    },
    [data, load],
  );

  // Ownership actions keep the current card; just reconcile in the background.
  const handleClaim = React.useCallback(
    async (id: string) => {
      await claimQuestion(id);
      void load({ silent: true });
    },
    [load],
  );
  const handleRelease = React.useCallback(
    async (id: string) => {
      await releaseQuestion(id);
      void load({ silent: true });
    },
    [load],
  );
  const handleApprove = React.useCallback(
    async (id: string, status: ContentReviewStatus, comment: string) => {
      await approveQuestion(id, status, comment);
      advancePastDecided(id);
    },
    [advancePastDecided],
  );
  const handleReject = React.useCallback(
    async (id: string, comment: string) => {
      await rejectQuestion(id, comment);
      advancePastDecided(id);
    },
    [advancePastDecided],
  );
  const handleEscalate = React.useCallback(
    async (id: string, comment: string) => {
      await escalateQuestion(id, comment);
      advancePastDecided(id);
    },
    [advancePastDecided],
  );

  const boardColumns: BoardColumnState[] = REVIEW_COLUMNS.map((column) => ({
    column,
    phase: column.awaiting ? "ready" : data[column.key].phase,
    questions: column.awaiting ? [] : data[column.key].questions,
  }));

  const drawerLabel = drawerQuestion
    ? subtopicIndex[drawerQuestion.subtopic_id ?? ""]
    : undefined;

  // j / k navigation: move to the next / previous card in board order.
  const navigate = React.useCallback(
    (delta: 1 | -1) => {
      setDrawerQuestion((current) => {
        if (!current) return current;
        const flat = flatList(data);
        const idx = flat.findIndex((q) => q.id === current.id);
        if (idx < 0) return current;
        const target = flat[idx + delta];
        return target ?? current;
      });
    },
    [data],
  );

  return (
    <div className="space-y-4">
      <ReviewFilters
        exams={exams}
        examId={examId}
        onExamChange={setExamId}
        onRefresh={() => void load()}
      />

      <ReviewQueueBoard
        columns={boardColumns}
        examNameIndex={examNameIndex}
        subtopicIndex={subtopicIndex}
        onOpen={openDrawer}
        onRetry={() => void load()}
      />

      <ReviewDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        question={drawerQuestion}
        examName={
          drawerQuestion
            ? examNameIndex[drawerQuestion.exam_id ?? ""]
            : undefined
        }
        subject={drawerLabel?.subject}
        topic={drawerLabel?.topic}
        onClaim={handleClaim}
        onRelease={handleRelease}
        onApprove={handleApprove}
        onReject={handleReject}
        onEscalate={handleEscalate}
        onNext={() => navigate(1)}
        onPrev={() => navigate(-1)}
      />
    </div>
  );
}
