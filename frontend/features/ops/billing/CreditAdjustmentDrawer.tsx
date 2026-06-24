"use client";

import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { ApiError } from "@/lib/errors";
import { adjustUserCredits } from "./billingService";

/**
 * CreditAdjustmentDrawer — OPS-07 (Part E).
 *
 * The only mutation in the workspace. Posts a signed admin adjustment to
 * POST /ops/users/{id}/credits/adjust/ via the service layer — no direct writes,
 * no optimistic update. On success it asks the parent to RELOAD from the API
 * (`onAdjusted`) and closes. Server validation errors are shown verbatim. Radix
 * provides focus trap/restore, Escape-to-close and aria-modal; the form is fully
 * labelled. English-only.
 */
function extractServerError(err: unknown): string {
  if (err instanceof ApiError) {
    const payload = err.payload as { detail?: unknown } | null;
    if (payload && typeof payload.detail === "string") return payload.detail;
    if (err.message) return err.message;
  }
  return "The adjustment could not be applied. Please try again.";
}

export interface CreditAdjustmentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  /** Called after a successful adjustment so the parent reloads from the API. */
  onAdjusted: () => void;
}

export function CreditAdjustmentDrawer({
  open,
  onOpenChange,
  userId,
  userName,
  onAdjusted,
}: CreditAdjustmentDrawerProps) {
  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset the form each time the drawer opens.
  React.useEffect(() => {
    if (open) {
      setAmount("");
      setReason("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const trimmed = amount.trim();
  const canSubmit = trimmed !== "" && Number(trimmed) !== 0 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await adjustUserCredits(userId, { amount: trimmed, description: reason });
      onAdjusted(); // parent reloads balance + ledger from the API
      onOpenChange(false);
    } catch (err) {
      setError(extractServerError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-label="Adjust credits"
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
        >
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-base font-semibold text-foreground">
                Adjust credits
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="truncate text-xs text-muted-foreground">
                {userName}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label="Close details"
              className="rounded-sm p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className="space-y-1">
                <Label htmlFor="adjust-amount">Amount</Label>
                <Input
                  id="adjust-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 50 or -25"
                  aria-describedby="adjust-amount-hint"
                />
                <p id="adjust-amount-hint" className="text-xs text-muted-foreground">
                  Use a negative value to deduct credits. The server validates the
                  result.
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="adjust-reason">Reason</Label>
                <textarea
                  id="adjust-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Why is this adjustment being made?"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <p className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                This appends an immutable adjustment to the credit ledger and
                updates the balance. It cannot be undone — apply a reversing
                adjustment to correct a mistake.
              </p>

              {error && (
                <p
                  role="alert"
                  className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {error}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border p-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {submitting ? "Applying…" : "Confirm adjustment"}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
