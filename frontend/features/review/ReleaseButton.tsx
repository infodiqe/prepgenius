"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { toast } from "@/features/feedback/useToast";
import { useErrorToast } from "@/features/feedback/useErrorToast";
import { releaseQuestion } from "./reviewService";

/**
 * Release the current user's claim. The backend enforces ownership (only the
 * claim owner — or a broad-release role — may release).
 */
export function ReleaseButton({
  questionId,
  onDone,
}: {
  questionId: string;
  onDone: () => void;
}) {
  const t = useTranslations("review");
  const notifyError = useErrorToast();
  const [pending, setPending] = React.useState(false);

  async function handleRelease() {
    setPending(true);
    try {
      await releaseQuestion(questionId);
      toast({ variant: "success", title: t("released_success") });
      onDone();
    } catch (err) {
      notifyError(err);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleRelease}
      disabled={pending}
    >
      {t("action_release")}
    </Button>
  );
}
