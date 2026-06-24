import React from "react";
import { Button, Skeleton } from "@/components/ui";
import type { PreviousYearPaper } from "./examService";

/**
 * PreviousYearPaperPanel — OPS-05.
 *
 * Read-only listing of previous-year papers (optionally scoped to one exam via
 * the exam selector). Loading / empty / error / ready states. No upload / edit /
 * delete. English-only; accessible table semantics.
 */
export type PaperPhase = "loading" | "error" | "ready";

export interface PreviousYearPaperPanelProps {
  phase: PaperPhase;
  papers: PreviousYearPaper[];
  examNameIndex: Record<string, string>;
  onRetry: () => void;
}

const COLUMNS = ["Code", "Exam", "Year", "Language", "Questions", "File"] as const;

export function PreviousYearPaperPanel({
  phase,
  papers,
  examNameIndex,
  onRetry,
}: PreviousYearPaperPanelProps) {
  if (phase === "loading") {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading papers"
        className="space-y-2"
      >
        {Array.from({ length: 4 }).map((_, i) => (
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
          Could not load papers
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

  if (papers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card p-10 text-center">
        <p className="text-sm font-medium text-foreground">No papers found</p>
        <p className="text-sm text-muted-foreground">
          No previous-year papers are available for this selection.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Previous year papers</caption>
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
          </tr>
        </thead>
        <tbody>
          {papers.map((paper) => (
            <tr key={paper.id} className="border-t border-border">
              <td className="px-3 py-2 align-middle">
                <span className="font-mono text-xs text-muted-foreground">
                  {paper.code}
                </span>
              </td>
              <td className="px-3 py-2 align-middle text-foreground">
                {examNameIndex[paper.exam_id] ?? "—"}
              </td>
              <td className="px-3 py-2 align-middle text-foreground">
                {paper.year}
              </td>
              <td className="px-3 py-2 align-middle uppercase text-muted-foreground">
                {paper.language}
              </td>
              <td className="px-3 py-2 align-middle text-foreground">
                {paper.total_questions}
              </td>
              <td className="px-3 py-2 align-middle text-muted-foreground">
                {paper.file_path ? "Available" : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
