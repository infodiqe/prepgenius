"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Compass } from "lucide-react";

import {
  Card,
  CardContent,
  Button,
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateAction,
} from "@/components/ui";
import { createAttempt, startAttempt } from "@/features/attempts/attemptService";
import { toast } from "@/features/feedback/useToast";
import { useErrorToast } from "@/features/feedback/useErrorToast";

/*
 * DiagnosticCard — first diagnostic entry (Sprint 1 · T13).
 *
 * Shown on the dashboard to a freshly-onboarded student who has no attempts yet
 * (the server decides visibility, and only when a diagnostic mock test is
 * configured). Launches the first assessment by reusing the existing attempt
 * APIs: create → start → route into the existing mock player. No scoring,
 * results, or player changes.
 *
 * SPR1-HOTFIX-02: the diagnostic is a `full_mock` attempt bound to the exam's
 * configured diagnostic mock test (CONTENT-HOTFIX-01) so the existing player can
 * load its questions. Launch routes to `/practice/{id}?flow=diagnostic`; the
 * `flow` marker makes the player finalise on the diagnostic completion screen.
 * Question selection, timing, and scoring remain entirely server-driven.
 *
 * Frameworks: T01 success toast, T02 error framework (classified toast), T04
 * empty-state presentation. A `role="status"` live region announces launching;
 * the button is `aria-busy` and a ref-guard prevents a duplicate launch.
 */

const DIAGNOSTIC_ATTEMPT_TYPE = "full_mock" as const;

export function DiagnosticCard({
  examId,
  diagnosticMockTestId,
}: {
  examId: string;
  diagnosticMockTestId: string;
}) {
  const t = useTranslations("diagnostic");
  const router = useRouter();
  const notifyError = useErrorToast();

  const [isLaunching, setIsLaunching] = React.useState(false);
  // Synchronous guard so a rapid second click can't create a second attempt.
  const launchingRef = React.useRef(false);
  const titleId = React.useId();

  const launch = async () => {
    if (launchingRef.current) return;
    launchingRef.current = true;
    setIsLaunching(true);

    try {
      const attempt = await createAttempt({
        exam_id: examId,
        attempt_type: DIAGNOSTIC_ATTEMPT_TYPE,
        mock_test_id: diagnosticMockTestId,
        // duration is governed by the mock test (set server-side on start).
      });
      await startAttempt(attempt.id);
      toast({ variant: "success", title: t("launch_success") });
      // Navigate into the existing player; the flow marker routes the post-submit
      // finalisation to the diagnostic completion screen. Keep the button
      // disabled (don't reset the guard) so we never double-launch while routing.
      router.push(`/practice/${attempt.id}?flow=diagnostic`);
    } catch (err) {
      notifyError(err);
      launchingRef.current = false;
      setIsLaunching(false);
    }
  };

  return (
    <Card
      role="region"
      aria-labelledby={titleId}
      className="border-primary/20 bg-primary/5"
    >
      <CardContent className="p-0">
        <EmptyState className="py-10">
          <EmptyStateIcon className="bg-primary/10 text-primary">
            <Compass />
          </EmptyStateIcon>
          <EmptyStateTitle id={titleId} as="h2">
            {t("title")}
          </EmptyStateTitle>
          <EmptyStateDescription>{t("description")}</EmptyStateDescription>
          <EmptyStateAction>
            <Button
              type="button"
              onClick={launch}
              disabled={isLaunching}
              aria-busy={isLaunching || undefined}
            >
              {isLaunching ? (
                <span className="flex items-center gap-2">
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                  {t("launching")}
                </span>
              ) : (
                t("cta")
              )}
            </Button>
          </EmptyStateAction>
        </EmptyState>
        {/* Screen-reader launch announcement (error/success go via toasts). */}
        <span role="status" aria-live="polite" className="sr-only">
          {isLaunching ? t("launching") : ""}
        </span>
      </CardContent>
    </Card>
  );
}
