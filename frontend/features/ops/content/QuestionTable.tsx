import React from "react";
import { Eye } from "lucide-react";
import { Button, Skeleton } from "@/components/ui";
import { StatusBadge } from "./StatusBadge";
import { OriginBadge } from "./OriginBadge";
import { AwaitingBackendNote } from "./AwaitingBackendNote";
import type {
  ContentQuestion,
  ContentReviewStatus,
  SubtopicLabel,
} from "./contentService";

/**
 * QuestionTable — OPS-02 / OPS-STAB-01.
 *
 * Read/management table over the existing questions endpoint. Columns: ID,
 * snippet, exam, subject, topic, origin, status, created date — plus a "View"
 * action that opens the read-only detail drawer. Origin (official / AI / human)
 * surfaces the content-trust signal (OPS-STAB-01 Task 4).
 *
 * Loading / empty / error states are handled here. The list endpoint is
 * unpaginated; rather than render dead, permanently-disabled paging controls the
 * footer states the count with an honest "awaiting backend support" note
 * (OPS-STAB-01 Task 5). English-only.
 */

export type TablePhase = "loading" | "error" | "ready";

export interface QuestionTableProps {
  phase: TablePhase;
  questions: ContentQuestion[];
  examNameIndex: Record<string, string>;
  subtopicIndex: Record<string, SubtopicLabel>;
  onOpen: (question: ContentQuestion) => void;
  onRetry: () => void;
}

const COLUMNS = [
  "Question ID",
  "Question",
  "Exam",
  "Subject",
  "Topic",
  "Origin",
  "Status",
  "Created",
] as const;

function snippet(stem: string): string {
  const text = stem.trim();
  return text.length > 90 ? `${text.slice(0, 90)}…` : text;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

export function QuestionTable({
  phase,
  questions,
  examNameIndex,
  subtopicIndex,
  onOpen,
  onRetry,
}: QuestionTableProps) {
  if (phase === "loading") {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading questions"
        className="space-y-2"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-8 text-center"
      >
        <p className="text-sm font-medium text-foreground">
          Could not load questions
        </p>
        <p className="text-sm text-muted-foreground">
          Something went wrong while fetching from the server.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card p-10 text-center">
        <p className="text-sm font-medium text-foreground">No questions found</p>
        <p className="text-sm text-muted-foreground">
          Try a different exam or status filter.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Questions</caption>
          <thead className="bg-muted/50">
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground"
                >
                  {col}
                </th>
              ))}
              <th scope="col" className="w-16 px-3 py-2 text-left">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => {
              const label = subtopicIndex[q.subtopic_id ?? ""];
              return (
                <tr
                  key={q.id}
                  className="border-t border-border transition-colors hover:bg-muted/40"
                >
                  <td className="px-3 py-2 align-middle">
                    <span className="font-mono text-xs text-muted-foreground">
                      {shortId(q.id)}
                    </span>
                  </td>
                  <td className="max-w-md px-3 py-2 align-middle">
                    <span className="line-clamp-2 text-foreground">
                      {snippet(q.stem)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 align-middle text-foreground">
                    {examNameIndex[q.exam_id ?? ""] ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 align-middle text-foreground">
                    {label?.subject ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 align-middle text-foreground">
                    {label?.topic ?? "—"}
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <OriginBadge origin={q.origin} />
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <StatusBadge
                      status={q.review_status as ContentReviewStatus}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 align-middle text-muted-foreground">
                    {formatDate(q.created_at)}
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpen(q)}
                      aria-label={`View question ${shortId(q.id)}`}
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* The list endpoint is unpaginated — state the count honestly rather than
          render permanently-disabled paging controls (OPS-STAB-01 Task 5). */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {questions.length} {questions.length === 1 ? "question" : "questions"}
        </span>
        <AwaitingBackendNote>
          Pagination awaiting backend support
        </AwaitingBackendNote>
      </div>
    </div>
  );
}
