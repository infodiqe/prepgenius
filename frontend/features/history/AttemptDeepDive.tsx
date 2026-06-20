"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";

import {
  Card,
  CardHeader,
  CardDescription,
  CardContent,
  Button,
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
  EmptyStateAction,
} from "@/components/ui";
import { useErrorToast } from "@/features/feedback/useErrorToast";
import {
  getAttemptResults,
  getAttemptAnalytics,
  type AttemptResults,
  type AttemptAnalytics,
} from "@/features/attempts/attemptService";
import { HistorySkeleton } from "./components/HistorySkeleton";

/*
 * Per-Attempt Deep Dive — Sprint 4 · T21, Section B (route /history/[attemptId]).
 *
 * Reuses the existing per-attempt endpoints: GET /results/ (score summary) and
 * GET /analytics/ (subject + topic breakdown). Renders backend values only — no
 * analytics computed; bar widths only clamp backend accuracy for layout. The
 * existing /results page (full question-by-question review) is left untouched.
 */

type Phase = "loading" | "ready" | "error";
type Section = AttemptAnalytics["subjects"][number];

function barWidth(accuracy: string | null): number {
  const n = accuracy == null ? 0 : Number(accuracy);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function SectionBars({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: Section[];
  emptyText: string;
}) {
  const headingId = React.useId();
  return (
    <Card role="region" aria-labelledby={headingId}>
      <CardHeader>
        <h2
          id={headingId}
          className="text-lg font-semibold leading-none tracking-tight text-foreground"
        >
          {title}
        </h2>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="space-y-4">
            {items.map((s) => {
              const width = barWidth(s.accuracy);
              return (
                <li key={s.id} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">
                      {s.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {s.accuracy ?? "0"}% · {s.correct}/{s.total}
                    </span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={Math.round(width)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${s.name}: ${s.accuracy ?? "0"}%`}
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function AttemptDeepDive({ attemptId }: { attemptId: string }) {
  const t = useTranslations("history");
  const notifyError = useErrorToast();

  const [phase, setPhase] = React.useState<Phase>("loading");
  const [results, setResults] = React.useState<AttemptResults | null>(null);
  const [analytics, setAnalytics] = React.useState<AttemptAnalytics | null>(null);

  const load = React.useCallback(async () => {
    setPhase("loading");
    try {
      const [res, ana] = await Promise.all([
        getAttemptResults(attemptId),
        getAttemptAnalytics(attemptId),
      ]);
      setResults(res);
      setAnalytics(ana);
      setPhase("ready");
    } catch (err) {
      notifyError(err);
      setPhase("error");
    }
  }, [attemptId, notifyError]);

  React.useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  const backLink = (
    <Button asChild variant="link" className="h-auto gap-1 p-0 text-sm">
      <Link href="/history">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("back_to_history")}
      </Link>
    </Button>
  );

  if (phase === "loading") {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {backLink}
        <HistorySkeleton blocks={3} />
      </div>
    );
  }

  if (phase === "error" || !results) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {backLink}
        <Card>
          <CardContent className="p-0">
            <EmptyState className="py-10">
              <EmptyStateIcon className="bg-destructive/10 text-destructive">
                <AlertCircle />
              </EmptyStateIcon>
              <EmptyStateTitle as="h1">{t("detail_error_title")}</EmptyStateTitle>
              <EmptyStateDescription>
                {t("detail_error_desc")}
              </EmptyStateDescription>
              <EmptyStateAction>
                <Button type="button" onClick={() => load()}>
                  {t("retry")}
                </Button>
              </EmptyStateAction>
            </EmptyState>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats: Array<{ label: string; value: React.ReactNode }> = [
    {
      label: t("stat_score"),
      value: `${results.score ?? "0"} / ${results.max_score ?? "0"}`,
    },
    { label: t("stat_accuracy"), value: `${results.accuracy ?? "0"}%` },
    { label: t("stat_correct"), value: results.correct },
    { label: t("stat_incorrect"), value: results.incorrect },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {backLink}

      <Card role="region" aria-labelledby="attempt-summary-heading">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
            <h1
              id="attempt-summary-heading"
              className="text-xl font-bold tracking-tight text-foreground"
            >
              {t("detail_title")}
            </h1>
          </div>
          <CardDescription>
            {results.pass_status === "pass"
              ? t("pass_status_pass")
              : t("pass_status_needs_work")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-border bg-muted/40 p-4 text-center"
              >
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </dt>
                <dd className="mt-1 text-2xl font-bold text-foreground">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <SectionBars
        title={t("subjects_title")}
        items={analytics?.subjects ?? []}
        emptyText={t("subjects_empty_desc")}
      />
      <SectionBars
        title={t("topics_title")}
        items={analytics?.topics ?? []}
        emptyText={t("topics_empty_desc")}
      />
    </div>
  );
}
