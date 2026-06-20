"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { toast } from "@/features/feedback/useToast";
import { useErrorToast } from "@/features/feedback/useErrorToast";
import { claimQuestion } from "./reviewService";

/**
 * Claim a question for review. Calls the existing claim endpoint; the backend
 * enforces single-claim (returns 409 if already claimed).
 */
export function ClaimButton({
  questionId,
  onDone,
}: {
  questionId: string;
  onDone: () => void;
}) {
  const t = useTranslations("review");
  const notifyError = useErrorToast();
  const [pending, setPending] = React.useState(false);

  async function handleClaim() {
    setPending(true);
    try {
      await claimQuestion(questionId);
      toast({ variant: "success", title: t("claimed_success") });
      onDone();
    } catch (err) {
      notifyError(err);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" onClick={handleClaim} disabled={pending}>
      {t("action_claim")}
    </Button>
  );
}
