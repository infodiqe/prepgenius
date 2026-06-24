import React from "react";
import { RefreshCw } from "lucide-react";
import { Button, Label } from "@/components/ui";
import type { ContentExam } from "../content/contentService";

/**
 * ReviewFilters — OPS-03.
 *
 * Exam scopes every column to the server `exam_id` filter (the one list filter
 * the API supports for the review pipeline). Refresh re-fetches from the server
 * (the board never holds optimistic state). English-only.
 */
const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export interface ReviewFiltersProps {
  exams: ContentExam[];
  examId: string;
  onExamChange: (examId: string) => void;
  onRefresh: () => void;
}

export function ReviewFilters({
  exams,
  examId,
  onExamChange,
  onRefresh,
}: ReviewFiltersProps) {
  return (
    <section
      aria-label="Review filters"
      className="flex flex-wrap items-end gap-3"
    >
      <div className="w-full max-w-xs space-y-1">
        <Label htmlFor="review-filter-exam" className="text-xs">
          Exam
        </Label>
        <select
          id="review-filter-exam"
          className={SELECT_CLASS}
          value={examId}
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

      <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
        <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden="true" />
        Refresh
      </Button>
    </section>
  );
}
