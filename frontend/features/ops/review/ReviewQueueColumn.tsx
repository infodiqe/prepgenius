import React from "react";
import { Button, Skeleton } from "@/components/ui";
import { AwaitingBackendNote } from "../content/AwaitingBackendNote";
import { ReviewQueueCard } from "./ReviewQueueCard";
import type {
  ContentQuestion,
  SubtopicLabel,
} from "../content/contentService";
import type { ReviewColumnDef } from "./reviewQueueService";

/**
 * ReviewQueueColumn — OPS-03.
 *
 * One board column with its own loading / empty / error / ready states. Columns
 * the API cannot serve (claim-ownership) render an "Awaiting backend support"
 * notice instead of data. English-only; the column is a labelled region.
 */
export type ColumnPhase = "loading" | "error" | "ready";

export interface ReviewQueueColumnProps {
  column: ReviewColumnDef;
  phase: ColumnPhase;
  questions: ContentQuestion[];
  examNameIndex: Record<string, string>;
  subtopicIndex: Record<string, SubtopicLabel>;
  onOpen: (question: ContentQuestion) => void;
  onRetry: () => void;
}

export function ReviewQueueColumn({
  column,
  phase,
  questions,
  examNameIndex,
  subtopicIndex,
  onOpen,
  onRetry,
}: ReviewQueueColumnProps) {
  const count = column.awaiting ? null : questions.length;

  return (
    <section
      aria-label={column.title}
      className="flex w-72 shrink-0 flex-col gap-2 rounded-lg border border-border bg-card p-3"
    >
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">{column.title}</h2>
        {count !== null && (
          <span
            className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            aria-label={`${count} ${count === 1 ? "item" : "items"}`}
          >
            {count}
          </span>
        )}
      </header>

      {column.note && (
        <AwaitingBackendNote>{column.note}</AwaitingBackendNote>
      )}

      <div className="flex flex-col gap-2">
        {column.awaiting ? null : phase === "loading" ? (
          <div
            role="status"
            aria-label={`Loading ${column.title}`}
            className="space-y-2"
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : phase === "error" ? (
          <div
            role="alert"
            className="flex flex-col items-center gap-2 rounded-md border border-border p-4 text-center"
          >
            <p className="text-xs text-muted-foreground">Could not load</p>
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : questions.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
            No questions
          </p>
        ) : (
          questions.map((q) => (
            <ReviewQueueCard
              key={q.id}
              question={q}
              examName={examNameIndex[q.exam_id ?? ""]}
              label={subtopicIndex[q.subtopic_id ?? ""]}
              onOpen={onOpen}
            />
          ))
        )}
      </div>
    </section>
  );
}
