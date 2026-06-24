import React from "react";
import { Label } from "@/components/ui";
import { AwaitingBackendNote } from "../content/AwaitingBackendNote";
import type { ExamSummary } from "./examService";

/**
 * ExamFilters — OPS-05.
 *
 * The Exam selector scopes the hierarchy and papers views to one exam (the API
 * requires an exam id for the tree and accepts exam_id for papers) — this is
 * data-source selection, not client-side filtering. The exam-type and status
 * filters are rendered DISABLED with an "Awaiting backend support" note: the
 * exam list has no type/status query parameter. English-only.
 */
const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export interface ExamFiltersProps {
  exams: ExamSummary[];
  selectedExamId: string;
  onSelectExam: (examId: string) => void;
  /** Show the functional exam selector (hierarchy / papers sections). */
  showExamSelector: boolean;
  /** Show the (disabled) type/status filters (the Exams list section). */
  showListFilters: boolean;
  /** Hierarchy sections require an exam — drop the "All exams" option. */
  examRequired?: boolean;
}

export function ExamFilters({
  exams,
  selectedExamId,
  onSelectExam,
  showExamSelector,
  showListFilters,
  examRequired = false,
}: ExamFiltersProps) {
  return (
    <section
      aria-label="Exam filters"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-2xl"
    >
      {showExamSelector && (
        <div className="space-y-1">
          <Label htmlFor="exam-filter-exam" className="text-xs">
            Exam
          </Label>
          <select
            id="exam-filter-exam"
            className={SELECT_CLASS}
            value={selectedExamId}
            onChange={(e) => onSelectExam(e.target.value)}
          >
            {!examRequired && <option value="">All exams</option>}
            {examRequired && <option value="">Select an exam…</option>}
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {showListFilters && (
        <>
          <div className="space-y-1">
            <Label htmlFor="exam-filter-type" className="text-xs">
              Exam type
            </Label>
            <select
              id="exam-filter-type"
              className={SELECT_CLASS}
              disabled
              aria-describedby="exam-filter-note"
            >
              <option>All types</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="exam-filter-status" className="text-xs">
              Status
            </Label>
            <select
              id="exam-filter-status"
              className={SELECT_CLASS}
              disabled
              aria-describedby="exam-filter-note"
            >
              <option>All statuses</option>
            </select>
          </div>
          <AwaitingBackendNote className="sm:col-span-2">
            <span id="exam-filter-note">
              Type and status filters are awaiting backend support (no server-side
              filter parameters).
            </span>
          </AwaitingBackendNote>
        </>
      )}
    </section>
  );
}
