"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "@/components/ui";
import { toast } from "@/features/feedback/useToast";
import { useErrorToast } from "@/features/feedback/useErrorToast";
import { approveQuestion, type ReviewStatus } from "./reviewService";

/**
 * Approve a claimed question. Routes to the reviewer or SME approve endpoint
 * based on the current status; the backend enforces authority + transition.
 */
export function ApproveDialog({
  questionId,
  status,
  onDone,
}: {
  questionId: string;
  status: ReviewStatus;
  onDone: () => void;
}) {
  const t = useTranslations("review");
  const notifyError = useErrorToast();
  const [open, setOpen] = React.useState(false);
  const [comment, setComment] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await approveQuestion(questionId, status, comment);
      toast({ variant: "success", title: t("approved_success") });
      setOpen(false);
      setComment("");
      onDone();
    } catch (err) {
      notifyError(err);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">{t("action_approve")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("approve_title")}</DialogTitle>
          <DialogDescription>{t("approve_desc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <label
            htmlFor="approve-comment"
            className="text-sm font-medium text-foreground"
          >
            {t("comment_label")}
          </label>
          <textarea
            id="approve-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder={t("comment_placeholder")}
            className="w-full rounded-md border border-input bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {t("cancel")}
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleConfirm} disabled={pending}>
            {t("approve_confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
