import React from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import type { AiDraftListItem } from "./aiDraftService";

/**
 * DiscardDraftDialog — Section D confirmation. Radix Dialog provides focus
 * trap, Escape-to-close, and labelling. Destructive action is clearly worded.
 */
export interface DiscardDraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: AiDraftListItem | null;
  onConfirm: () => void;
  submitting: boolean;
  error: string | null;
}

export function DiscardDraftDialog({
  open,
  onOpenChange,
  draft,
  onConfirm,
  submitting,
  error,
}: DiscardDraftDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Discard this draft?</DialogTitle>
          <DialogDescription>
            The draft will be marked discarded and can no longer be imported. This does not affect
            any question already imported. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {draft && (
          <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            <span className="line-clamp-2">{draft.stem}</span>
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={submitting}
            aria-busy={submitting || undefined}
          >
            {submitting ? "Discarding…" : "Discard draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
