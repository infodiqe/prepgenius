import React from "react";
import { Label } from "@/components/ui";
import { cn } from "@/lib/utils";
import { AwaitingBackendNote } from "./AwaitingBackendNote";
import type { ContentExam, ContentReviewStatus } from "./contentService";

/**
 * QuestionFilters — OPS-02 (Section B).
 *
 * Exam and Status map to the two server-supported query params (`exam_id`,
 * `review_status`) and drive a re-fetch — no client-side filtering. Subject and
 * Topic have no server filter, so they are rendered DISABLED with an "Awaiting
 * backend support" note. English-only; native selects for accessible,
 * test-friendly controls.
 */

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

// The five statuses specified by OPS-02 (the backend also has `rejected`, which
// is intentionally out of this filter's scope per spec).
const STATUS_OPTIONS: ReadonlyArray<{ value: ContentReviewStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In Review" },
  { value: "sme_review", label: "SME Review" },
  { value: "approved", label: "Approved" },
  { value: "published", label: "Published" },
];

export interface QuestionFiltersProps {
  exams: ContentExam[];
  examId: string;
  status: "" | ContentReviewStatus;
  onExamChange: (examId: string) => void;
  onStatusChange: (status: "" | ContentReviewStatus) => void;
  disabled?: boolean;
}

export function QuestionFilters({
  exams,
  examId,
  status,
  onExamChange,
  onStatusChange,
  disabled = false,
}: QuestionFiltersProps) {
  return (
    <section
      aria-label="Question filters"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      {/* Exam — server filter */}
      <div className="space-y-1">
        <Label htmlFor="filter-exam" className="text-xs">
          Exam
        </Label>
        <select
          id="filter-exam"
          className={SELECT_CLASS}
          value={examId}
          disabled={disabled}
          onChange={(e) => onExamChange(e.target.value)}
        >
          <option value="">All exams</option>
          {exams.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.name}
            </option>
          ))}
        </select>
      </div>

      {/* Status — server filter */}
      <div className="space-y-1">
        <Label htmlFor="filter-status" className="text-xs">
          Status
        </Label>
        <select
          id="filter-status"
          className={SELECT_CLASS}
          value={status}
          disabled={disabled}
          onChange={(e) =>
            onStatusChange(e.target.value as "" | ContentReviewStatus)
          }
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Subject — awaiting backend support */}
      <div className="space-y-1">
        <Label htmlFor="filter-subject" className={cn("text-xs")}>
          Subject
        </Label>
        <select
          id="filter-subject"
          className={SELECT_CLASS}
          disabled
          aria-describedby="filter-taxonomy-note"
        >
          <option>All subjects</option>
        </select>
      </div>

      {/* Topic — awaiting backend support */}
      <div className="space-y-1">
        <Label htmlFor="filter-topic" className="text-xs">
          Topic
        </Label>
        <select
          id="filter-topic"
          className={SELECT_CLASS}
          disabled
          aria-describedby="filter-taxonomy-note"
        >
          <option>All topics</option>
        </select>
      </div>

      <AwaitingBackendNote className="sm:col-span-2 lg:col-span-4">
        <span id="filter-taxonomy-note">
          Subject and Topic filters are awaiting backend support (no server-side
          subject/topic filter).
        </span>
      </AwaitingBackendNote>
    </section>
  );
}
