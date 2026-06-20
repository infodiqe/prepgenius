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
import { rejectQuestion } from "./reviewService";

/**
 * Reject a claimed question. The backend validates the transition + authority.
 */
export function RejectDialog({
  questionId,
  onDone,
}: {
  questionId: string;
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
      await rejectQuestion(questionId, comment);
      toast({ variant: "success", title: t("rejected_success") });
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
        <Button type="button" variant="destructive">
          {t("action_reject")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("reject_title")}</DialogTitle>
          <DialogDescription>{t("reject_desc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <label
            htmlFor="reject-comment"
            className="text-sm font-medium text-foreground"
          >
            {t("comment_label")}
          </label>
          <textarea
            id="reject-comment"
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
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={pending}
          >
            {t("reject_confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
