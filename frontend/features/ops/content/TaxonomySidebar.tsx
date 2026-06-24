import React from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AwaitingBackendNote } from "./AwaitingBackendNote";
import type { ContentExam, ContentExamTree } from "./contentService";

/**
 * TaxonomySidebar — OPS-02 (Section G).
 *
 * Read-only Exam → Subject → Topic tree. Selecting an EXAM filters the table via
 * the server's `exam_id` param. Subject/Topic nodes are displayed read-only:
 * the list endpoint has no subject/topic filter, so selecting them to filter is
 * "awaiting backend support" (per the OPS-02 strict-API-only decision). No
 * taxonomy editing. English-only.
 */
export interface TaxonomySidebarProps {
  exams: ContentExam[];
  selectedExamId: string;
  /** Tree for the currently selected exam (subjects → topics). */
  tree: ContentExamTree | null;
  treeLoading?: boolean;
  onSelectExam: (examId: string) => void;
}

export function TaxonomySidebar({
  exams,
  selectedExamId,
  tree,
  treeLoading = false,
  onSelectExam,
}: TaxonomySidebarProps) {
  return (
    <nav
      aria-label="Content taxonomy"
      className="space-y-1 rounded-lg border border-border bg-card p-2"
    >
      <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Taxonomy
      </p>

      {exams.length === 0 ? (
        <p className="px-2 py-2 text-sm text-muted-foreground">No exams found</p>
      ) : (
        <ul className="space-y-0.5">
          {/* All exams (clears the exam filter) */}
          <li>
            <button
              type="button"
              aria-pressed={selectedExamId === ""}
              onClick={() => onSelectExam("")}
              className={cn(
                "flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selectedExamId === ""
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              All exams
            </button>
          </li>

          {exams.map((exam) => {
            const isSelected = exam.id === selectedExamId;
            return (
              <li key={exam.id}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  aria-expanded={isSelected}
                  onClick={() => onSelectExam(exam.id)}
                  className={cn(
                    "flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-transform",
                      isSelected && "rotate-90",
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{exam.name}</span>
                </button>

                {/* Subjects → Topics for the selected exam (read-only) */}
                {isSelected && (
                  <div className="ml-4 mt-1 border-l border-border pl-2">
                    {treeLoading ? (
                      <p className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground">
                        <Loader2
                          className="h-3 w-3 animate-spin"
                          aria-hidden="true"
                        />
                        Loading subjects…
                      </p>
                    ) : (tree?.subjects ?? []).length === 0 ? (
                      <p className="px-2 py-1 text-xs text-muted-foreground">
                        No subjects
                      </p>
                    ) : (
                      <ul className="space-y-0.5">
                        {(tree?.subjects ?? []).map((subject) => (
                          <li key={subject.id}>
                            <span className="block px-2 py-1 text-xs font-medium text-foreground">
                              {subject.name}
                            </span>
                            <ul className="ml-2 space-y-0.5">
                              {(subject.topics ?? []).map((topic) => (
                                <li
                                  key={topic.id}
                                  className="px-2 py-0.5 text-xs text-muted-foreground"
                                >
                                  {topic.name}
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    )}
                    <AwaitingBackendNote className="mt-1 px-2">
                      Subject/Topic filtering awaiting backend support
                    </AwaitingBackendNote>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
