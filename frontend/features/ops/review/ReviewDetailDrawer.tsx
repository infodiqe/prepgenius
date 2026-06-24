"use client";

import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button, Label } from "@/components/ui";
import { StatusBadge } from "../content/StatusBadge";
import type {
  ContentQuestion,
  ContentReviewStatus,
} from "../content/contentService";

/**
 * ReviewDetailDrawer — OPS-03 / OPS-STAB-01.
 *
 * Read-only question context plus the review actions, split into OWNERSHIP
 * (Claim / Release) and DECISION (Approve / Reject / Escalate) groups. The drawer
 * holds NO workflow logic: every button calls a server action passed in by the
 * workspace; the backend validates legality and the workspace advances on
 * success (in-flow auto-advance) without closing the drawer.
 *
 * Keyboard-first (OPS-STAB-01 §3.2): when the drawer is open and focus is not in
 * a text field — `j` next card · `k` previous card · `a` approve · `r` reject ·
 * `s` escalate. Reject and Escalate require a reason (§3.4): the buttons are
 * disabled until one is entered, and the keyboard shortcuts focus the reason
 * field instead of submitting. English-only; Radix supplies focus
 * trap/restore, Escape-to-close, aria-modal.
 */
export interface ReviewDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: ContentQuestion | null;
  examName?: string;
  subject?: string;
  topic?: string;
  onClaim: (id: string) => Promise<void>;
  onRelease: (id: string) => Promise<void>;
  onApprove: (
    id: string,
    status: ContentReviewStatus,
    comment: string,
  ) => Promise<void>;
  onReject: (id: string, comment: string) => Promise<void>;
  onEscalate: (id: string, comment: string) => Promise<void>;
  /** j — advance to the next card in board order (keeps the drawer open). */
  onNext?: () => void;
  /** k — go to the previous card in board order. */
  onPrev?: () => void;
}

/** True when a keystroke is being typed into an editable control. */
function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="ml-1.5 rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] leading-none text-muted-foreground">
      {children}
    </kbd>
  );
}

export function ReviewDetailDrawer({
  open,
  onOpenChange,
  question,
  examName,
  subject,
  topic,
  onClaim,
  onRelease,
  onApprove,
  onReject,
  onEscalate,
  onNext,
  onPrev,
}: ReviewDetailDrawerProps) {
  const [comment, setComment] = React.useState("");
  const [pending, setPending] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const commentRef = React.useRef<HTMLTextAreaElement>(null);

  // Reset transient action state whenever the drawer opens a (different) question.
  React.useEffect(() => {
    if (open) {
      setComment("");
      setError(null);
      setPending(null);
    }
  }, [open, question?.id]);

  const run = React.useCallback(
    async (key: string, action: () => Promise<void>) => {
      setPending(key);
      setError(null);
      try {
        await action();
      } catch (e) {
        setError(e instanceof Error && e.message ? e.message : "Action failed");
      } finally {
        setPending(null);
      }
    },
    [],
  );

  const busy = pending !== null;
  const status = (question?.review_status ?? "draft") as ContentReviewStatus;
  const hasReason = comment.trim() !== "";

  const focusReason = React.useCallback(() => {
    commentRef.current?.focus();
  }, []);

  // Action triggers shared by the buttons and the keyboard shortcuts.
  const triggerApprove = React.useCallback(() => {
    if (!question || busy) return;
    void run("approve", () => onApprove(question.id, status, comment));
  }, [question, busy, run, onApprove, status, comment]);

  const triggerReject = React.useCallback(() => {
    if (!question || busy) return;
    if (!hasReason) {
      focusReason();
      return;
    }
    void run("reject", () => onReject(question.id, comment));
  }, [question, busy, hasReason, focusReason, run, onReject, comment]);

  const triggerEscalate = React.useCallback(() => {
    if (!question || busy) return;
    if (!hasReason) {
      focusReason();
      return;
    }
    void run("escalate", () => onEscalate(question.id, comment));
  }, [question, busy, hasReason, focusReason, run, onEscalate, comment]);

  // Keyboard-first review (active only while the drawer is open and the reviewer
  // is not typing into a field).
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      switch (e.key.toLowerCase()) {
        case "j":
          if (onNext) {
            e.preventDefault();
            onNext();
          }
          break;
        case "k":
          if (onPrev) {
            e.preventDefault();
            onPrev();
          }
          break;
        case "a":
          if (question) {
            e.preventDefault();
            triggerApprove();
          }
          break;
        case "r":
          if (question) {
            e.preventDefault();
            triggerReject();
          }
          break;
        case "s":
          if (question) {
            e.preventDefault();
            triggerEscalate();
          }
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, question, onNext, onPrev, triggerApprove, triggerReject, triggerEscalate]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-label="Review question"
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
        >
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <div>
              <DialogPrimitive.Title className="text-base font-semibold text-foreground">
                Review question
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-muted-foreground">
                Actions are validated by the server
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
                <section aria-label="Question" className="space-y-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={status} />
                    <span className="text-xs text-muted-foreground">
                      {examName ?? "—"}
                      {subject ? ` · ${subject}` : ""}
                      {topic ? ` / ${topic}` : ""}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-foreground">
                    {question.stem}
                  </p>
                  <ul className="space-y-1">
                    {(question.options ?? []).map((opt) => (
                      <li
                        key={opt.id}
                        className="flex gap-2 rounded-md border border-border p-2 text-sm"
                      >
                        <span className="font-mono text-xs text-muted-foreground">
                          {opt.label}
                        </span>
                        <span className="text-foreground">{opt.body}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Actions */}
                <section aria-label="Review actions" className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="review-comment" className="text-xs">
                      Reason
                      <span className="ml-1 font-normal text-muted-foreground">
                        (required to reject or escalate)
                      </span>
                    </Label>
                    <textarea
                      id="review-comment"
                      ref={commentRef}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Why is this being rejected or escalated? (logged to the audit trail)"
                    />
                  </div>

                  {error && (
                    <p
                      role="alert"
                      className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    >
                      {error}
                    </p>
                  )}

                  {/* Ownership group */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Ownership
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => run("claim", () => onClaim(question.id))}
                      >
                        Claim
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          run("release", () => onRelease(question.id))
                        }
                      >
                        Release
                      </Button>
                    </div>
                  </div>

                  {/* Decision group */}
                  <div className="space-y-1.5 border-t border-border pt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Decision
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={triggerApprove}
                      >
                        Approve
                        <Kbd>a</Kbd>
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={busy || !hasReason}
                        onClick={triggerReject}
                      >
                        Reject
                        <Kbd>r</Kbd>
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={busy || !hasReason}
                        onClick={triggerEscalate}
                      >
                        Escalate to SME
                        <Kbd>s</Kbd>
                      </Button>
                    </div>
                  </div>

                  {/* Keyboard hint */}
                  <p className="text-xs text-muted-foreground">
                    Keyboard: <kbd className="font-mono">j</kbd> /{" "}
                    <kbd className="font-mono">k</kbd> move between cards ·{" "}
                    <kbd className="font-mono">a</kbd> approve ·{" "}
                    <kbd className="font-mono">r</kbd> reject ·{" "}
                    <kbd className="font-mono">s</kbd> escalate
                  </p>
                </section>
              </>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
