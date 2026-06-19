"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Skeleton,
  SkeletonText,
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
} from "@/components/ui";
import { getAttemptDetails, type ExamAttempt } from "@/features/attempts/attemptService";
import { toast } from "@/features/feedback/useToast";
import { useErrorToast } from "@/features/feedback/useErrorToast";

/*
 * DiagnosticCompletion — post-submission experience (Sprint 1 · T13.5).
 *
 * Shown after a student submits their first diagnostic. Reads the scored attempt
 * via the existing GET /attempts/{id}/ endpoint (no new APIs, no scoring/results
 * changes) and renders one of:
 *   - scored  → score / accuracy / total / correct + "View Full Results" + "Go to Dashboard"
 *   - pending → "scoring in progress" + a manual refresh + "Go to Dashboard"
 *   - error   → T04 empty state + retry
 *
 * Frameworks: T01 success toast, T02 error framework, T03 skeleton (loading),
 * T04 empty state (error). Accessibility: focus moves to the resolved heading,
 * a role="status" live region announces loading/pending, the refresh button is
 * aria-busy. The full results breakdown lives on the existing results page —
 * this screen does not duplicate or redesign it.
 */

type Phase = "loading" | "scored" | "pending" | "error";

function isScored(status: string): boolean {
  return status === "scored";
}

export function DiagnosticCompletion({ attemptId }: { attemptId: string }) {
  const t = useTranslations("diagnostic_complete");
  const router = useRouter();
  const notifyError = useErrorToast();

  const [phase, setPhase] = React.useState<Phase>("loading");
  const [attempt, setAttempt] = React.useState<ExamAttempt | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  // Callback ref typed to HTMLElement so it works for both CardTitle (h3) and
  // EmptyStateTitle (h1) without a per-element ref-type mismatch.
  const headingRef = React.useRef<HTMLElement | null>(null);
  const setHeading = React.useCallback((el: HTMLElement | null) => {
    headingRef.current = el;
  }, []);

  const load = React.useCallback(
    async (mode: "initial" | "refresh") => {
      if (mode === "refresh") setIsRefreshing(true);
      else setPhase("loading");
      try {
        const data = await getAttemptDetails(attemptId);
        setAttempt(data);
        if (isScored(data.status)) {
          setPhase("scored");
          toast({ variant: "success", title: t("scored_success") });
        } else {
          setPhase("pending");
        }
      } catch (err) {
        notifyError(err);
        setPhase("error");
      } finally {
        if (mode === "refresh") setIsRefreshing(false);
      }
    },
    [attemptId, notifyError, t],
  );

  // Auto-load once on mount; subsequent fetches are user-driven (refresh/retry).
  React.useEffect(() => {
    void load("initial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  // Move focus to the resolved heading for screen-reader users.
  React.useEffect(() => {
    if (phase !== "loading") headingRef.current?.focus();
  }, [phase]);

  const goDashboard = () => router.push("/dashboard");
  const goResults = () => router.push(`/results/${attemptId}`);

  // ── Loading (T03) ──────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <Skeleton className="h-7 w-2/3" />
          <SkeletonText lines={1} label={t("loading")} />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3" aria-hidden="true">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Error (T02 toast already fired + T04 empty state) ────────────────────────
  if (phase === "error") {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-0">
          <EmptyState className="py-10">
            <EmptyStateIcon className="bg-destructive/10 text-destructive">
              <AlertCircle />
            </EmptyStateIcon>
            <EmptyStateTitle as="h1" ref={setHeading} tabIndex={-1} className="outline-none">
              {t("title_error")}
            </EmptyStateTitle>
            <EmptyStateDescription>{t("subtitle_error")}</EmptyStateDescription>
          </EmptyState>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => load("refresh")} className="w-full sm:flex-1" size="lg">
            {t("retry")}
          </Button>
          <Button onClick={goDashboard} variant="outline" className="w-full sm:flex-1" size="lg">
            {t("go_dashboard")}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // ── Pending — scoring still in progress ──────────────────────────────────────
  if (phase === "pending") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          </div>
          <CardTitle ref={setHeading} tabIndex={-1} className="outline-none">
            {t("title_pending")}
          </CardTitle>
          <CardDescription>{t("subtitle_pending")}</CardDescription>
        </CardHeader>
        <CardContent>
          <SkeletonText lines={2} label={t("pending_announce")} />
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={() => load("refresh")}
            disabled={isRefreshing}
            aria-busy={isRefreshing || undefined}
            className="w-full sm:flex-1"
            size="lg"
          >
            {isRefreshing ? t("refreshing") : t("refresh")}
          </Button>
          <Button onClick={goDashboard} variant="outline" className="w-full sm:flex-1" size="lg">
            {t("go_dashboard")}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // ── Scored — show the headline numbers ───────────────────────────────────────
  const stats: Array<{ label: string; value: React.ReactNode }> = [
    {
      label: t("stat_score"),
      value:
        attempt?.max_score != null
          ? `${attempt?.score ?? "—"} / ${attempt.max_score}`
          : (attempt?.score ?? "—"),
    },
    { label: t("stat_accuracy"), value: `${attempt?.accuracy ?? "0"}%` },
    { label: t("stat_total"), value: attempt?.total_questions ?? 0 },
    { label: t("stat_correct"), value: attempt?.correct ?? 0 },
  ];

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <CardTitle ref={setHeading} tabIndex={-1} className="outline-none">
          {t("title_scored")}
        </CardTitle>
        <CardDescription>{t("subtitle_scored")}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-muted/40 p-4 text-center"
            >
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </dt>
              <dd className="mt-1 text-2xl font-bold text-foreground">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={goResults} className="w-full sm:flex-1" size="lg">
          {t("view_results")}
        </Button>
        <Button onClick={goDashboard} variant="outline" className="w-full sm:flex-1" size="lg">
          {t("go_dashboard")}
        </Button>
      </CardFooter>
    </Card>
  );
}
