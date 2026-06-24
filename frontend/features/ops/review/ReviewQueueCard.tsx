import React from "react";
import { StatusBadge } from "../content/StatusBadge";
import type {
  ContentQuestion,
  ContentReviewStatus,
  SubtopicLabel,
} from "../content/contentService";

/**
 * ReviewQueueCard — OPS-03.
 *
 * Compact, keyboard-focusable summary of a question in a board column. Selecting
 * the card opens the read-only detail drawer where review actions live. The card
 * itself triggers no workflow transitions. English-only.
 */
export interface ReviewQueueCardProps {
  question: ContentQuestion;
  examName?: string;
  label?: SubtopicLabel;
  onOpen: (question: ContentQuestion) => void;
}

function snippet(stem: string): string {
  const text = stem.trim();
  return text.length > 110 ? `${text.slice(0, 110)}…` : text;
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

export function ReviewQueueCard({
  question,
  examName,
  label,
  onOpen,
}: ReviewQueueCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(question)}
      aria-label={`Open question ${shortId(question.id)}`}
      className="flex w-full flex-col gap-2 rounded-lg border border-border bg-background p-3 text-left transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">
          {shortId(question.id)}
        </span>
        <StatusBadge status={question.review_status as ContentReviewStatus} />
      </div>
      <p className="line-clamp-3 text-sm text-foreground">
        {snippet(question.stem)}
      </p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
        <span>{examName ?? "—"}</span>
        {label && (
          <>
            <span aria-hidden="true">·</span>
            <span>
              {label.subject} / {label.topic}
            </span>
          </>
        )}
      </div>
    </button>
  );
}
