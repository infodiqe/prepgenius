import React from "react";
import { ReviewQueueColumn, type ColumnPhase } from "./ReviewQueueColumn";
import type {
  ContentQuestion,
  SubtopicLabel,
} from "../content/contentService";
import type { ReviewColumnDef } from "./reviewQueueService";

/**
 * ReviewQueueBoard — OPS-03.
 *
 * Horizontal board of review columns. Each column owns its own state; the board
 * just lays them out and forwards data + the open handler. No workflow logic
 * lives here. English-only.
 */
export interface BoardColumnState {
  column: ReviewColumnDef;
  phase: ColumnPhase;
  questions: ContentQuestion[];
}

export interface ReviewQueueBoardProps {
  columns: BoardColumnState[];
  examNameIndex: Record<string, string>;
  subtopicIndex: Record<string, SubtopicLabel>;
  onOpen: (question: ContentQuestion) => void;
  onRetry: () => void;
}

export function ReviewQueueBoard({
  columns,
  examNameIndex,
  subtopicIndex,
  onOpen,
  onRetry,
}: ReviewQueueBoardProps) {
  return (
    <div
      role="list"
      aria-label="Review queue board"
      className="flex gap-4 overflow-x-auto pb-2"
    >
      {columns.map(({ column, phase, questions }) => (
        <div role="listitem" key={column.key}>
          <ReviewQueueColumn
            column={column}
            phase={phase}
            questions={questions}
            examNameIndex={examNameIndex}
            subtopicIndex={subtopicIndex}
            onOpen={onOpen}
            onRetry={onRetry}
          />
        </div>
      ))}
    </div>
  );
}
