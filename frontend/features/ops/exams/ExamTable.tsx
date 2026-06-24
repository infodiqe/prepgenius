import React from "react";
import { CheckCircle2, CircleSlash, Eye } from "lucide-react";
import { Button, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { ExamSummary } from "./examService";

/**
 * ExamTable — OPS-05.
 *
 * Read-only listing of exam configurations with loading / empty / error / ready
 * states. Selecting a row opens the read-only detail drawer. No create / edit /
 * delete / activate actions. English-only; accessible table semantics.
 */
export type ExamTablePhase = "loading" | "error" | "ready";

export interface ExamTableProps {
  phase: ExamTablePhase;
  exams: ExamSummary[];
  onOpen: (exam: ExamSummary) => void;
  onRetry: () => void;
}

const COLUMNS = ["Code", "Name", "Type", "Audience", "Status", "Updated"] as const;

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

/** Active/Inactive badge — colour + icon + label (never colour alone). */
function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        active
          ? "bg-success text-success-foreground"
          : "bg-muted text-muted-foreground",
      )}
    >
      {active ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <CircleSlash className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      <span>{active ? "Active" : "Inactive"}</span>
    </span>
  );
}

export function ExamTable({ phase, exams, onOpen, onRetry }: ExamTableProps) {
  if (phase === "loading") {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading exams"
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
        <p className="text-sm font-medium text-foreground">Could not load exams</p>
        <p className="text-sm text-muted-foreground">
          Something went wrong while fetching from the server.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-card p-10 text-center">
        <p className="text-sm font-medium text-foreground">No exams found</p>
        <p className="text-sm text-muted-foreground">
          No exam configurations are available.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Exams</caption>
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
          {exams.map((exam) => (
            <tr
              key={exam.id}
              className="border-t border-border transition-colors hover:bg-muted/40"
            >
              <td className="px-3 py-2 align-middle">
                <span className="font-mono text-xs text-muted-foreground">
                  {exam.code}
                </span>
              </td>
              <td className="max-w-xs px-3 py-2 align-middle">
                <span className="line-clamp-1 text-foreground">{exam.name}</span>
              </td>
              <td className="px-3 py-2 align-middle capitalize text-foreground">
                {exam.exam_type}
              </td>
              <td className="px-3 py-2 align-middle text-muted-foreground">
                {exam.audience_is_minor ? "Minor" : "General"}
              </td>
              <td className="px-3 py-2 align-middle">
                <ActiveBadge active={exam.is_active} />
              </td>
              <td className="whitespace-nowrap px-3 py-2 align-middle text-muted-foreground">
                {formatDate(exam.updated_at)}
              </td>
              <td className="px-3 py-2 align-middle">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpen(exam)}
                  aria-label={`Open exam ${exam.code}`}
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
