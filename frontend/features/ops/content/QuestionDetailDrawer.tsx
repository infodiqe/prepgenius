import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { OriginBadge } from "./OriginBadge";
import {
  correctOptionLabel,
  type ContentQuestion,
  type ContentReviewStatus,
} from "./contentService";

/**
 * QuestionDetailDrawer — OPS-02 (Section E).
 *
 * READ-ONLY inspection of a question. No editing, no workflow actions, no
 * approve/publish/review buttons — this is a management surface only. Renders
 * only metadata the current API exposes; "Created By" is intentionally OMITTED
 * because the question read serializer has no author field (OPS-02 decision).
 * English-only. Radix provides focus trap/restore, Escape-to-close, aria-modal.
 */

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-sm text-foreground">{value}</dd>
    </div>
  );
}

export interface QuestionDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: ContentQuestion | null;
  examName?: string;
  subject?: string;
  topic?: string;
}

export function QuestionDetailDrawer({
  open,
  onOpenChange,
  question,
  examName,
  subject,
  topic,
}: QuestionDetailDrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-label="Question details"
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
        >
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <div>
              <DialogPrimitive.Title className="text-base font-semibold text-foreground">
                Question details
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-muted-foreground">
                Read-only view
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label="Close details"
              className="rounded-sm p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          {/* Body */}
          <div className="flex-1 space-y-6 overflow-y-auto p-4">
            {!question ? (
              <p className="text-sm text-muted-foreground">
                No question selected.
              </p>
            ) : (
              <>
                {/* Full question */}
                <section aria-label="Question">
                  <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Question
                  </h3>
                  <p className="whitespace-pre-wrap text-sm text-foreground">
                    {question.stem}
                  </p>
                </section>

                {/* Options */}
                <section aria-label="Options">
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Options
                  </h3>
                  <ul className="space-y-2">
                    {(question.options ?? []).map((opt) => (
                      <li
                        key={opt.id}
                        className={cn(
                          "flex items-start gap-2 rounded-md border border-border p-2",
                          opt.is_correct && "border-success",
                        )}
                      >
                        <span className="font-mono text-xs text-muted-foreground">
                          {opt.label}
                        </span>
                        <span className="flex-1 text-sm text-foreground">
                          {opt.body}
                        </span>
                        {opt.is_correct && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            Correct
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Correct answer */}
                <section aria-label="Correct answer">
                  <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Correct answer
                  </h3>
                  <p className="text-sm text-foreground">
                    {correctOptionLabel(question) ?? "—"}
                  </p>
                </section>

                {/* Explanation */}
                <section aria-label="Explanation">
                  <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Explanation
                  </h3>
                  <p className="whitespace-pre-wrap text-sm text-foreground">
                    {question.explanation?.trim() ? question.explanation : "—"}
                  </p>
                </section>

                {/* Metadata (only fields the API exposes; no "Created By") */}
                <section aria-label="Metadata">
                  <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Metadata
                  </h3>
                  <dl className="divide-y divide-border">
                    <MetaRow label="Status" value={<StatusBadge status={question.review_status as ContentReviewStatus} />} />
                    <MetaRow label="Exam" value={examName ?? "—"} />
                    <MetaRow label="Subject" value={subject ?? "—"} />
                    <MetaRow label="Topic" value={topic ?? "—"} />
                    <MetaRow
                      label="Origin"
                      value={
                        question.origin ? (
                          <OriginBadge origin={question.origin} />
                        ) : (
                          "—"
                        )
                      }
                    />
                    <MetaRow label="Language" value={question.language ?? "—"} />
                    <MetaRow label="Difficulty" value={String(question.difficulty ?? "—")} />
                    <MetaRow
                      label="Verified by"
                      value={question.verified_by_id ?? "—"}
                    />
                    <MetaRow
                      label="Created"
                      value={
                        question.created_at
                          ? new Date(question.created_at).toLocaleString("en-GB")
                          : "—"
                      }
                    />
                  </dl>
                </section>
              </>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
