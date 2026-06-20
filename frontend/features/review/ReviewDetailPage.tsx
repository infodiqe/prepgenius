"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/errors";
import { useAuth } from "@/features/auth/AuthContext";
import { useErrorToast } from "@/features/feedback/useErrorToast";
import {
  getReviewQuestion,
  getQuestionReviews,
  getExamTree,
  buildSubtopicIndex,
  deriveClaimState,
  type QuestionDetail,
  type ContentReview,
  type ReviewStatus,
  type SubtopicLabel,
} from "./reviewService";
import { ReviewStatusBadge } from "./ReviewCard";
import { ReviewSkeleton } from "./ReviewSkeleton";
import { ReviewErrorState } from "./ReviewErrorState";
import { ReviewEmptyState } from "./ReviewEmptyState";
import { ClaimButton } from "./ClaimButton";
import { ReleaseButton } from "./ReleaseButton";
import { ApproveDialog } from "./ApproveDialog";
import { RejectDialog } from "./RejectDialog";
import { EscalateDialog } from "./EscalateDialog";

/*
 * Review Board — question detail (Sections B + C). Read-only question view (no
 * inline editing) plus claim-gated workflow actions. Claim state is derived
 * from the audit history (see reviewService note); all mutations are
 * server-authoritative.
 */

type Phase = "loading" | "ready" | "error" | "not_found";

const ORIGIN_KEY: Record<string, string> = {
  official: "origin_official",
  ai: "origin_ai",
  manual: "origin_manual",
};

export function ReviewDetailPage({ id }: { id: string }) {
  const t = useTranslations("review");
  const notifyError = useErrorToast();
  const { user, isLoading: authLoading } = useAuth();

  const [phase, setPhase] = React.useState<Phase>("loading");
  const [question, setQuestion] = React.useState<QuestionDetail | null>(null);
  const [reviews, setReviews] = React.useState<ContentReview[]>([]);
  const [label, setLabel] = React.useState<SubtopicLabel | null>(null);

  const load = React.useCallback(async () => {
    setPhase("loading");
    try {
      const [q, revs] = await Promise.all([
        getReviewQuestion(id),
        getQuestionReviews(id),
      ]);
      setQuestion(q);
      setReviews(revs);
      // Resolve subject/topic for metadata (best-effort; ignore failures).
      if (q.exam_id && q.subtopic_id) {
        try {
          const tree = await getExamTree(q.exam_id);
          setLabel(buildSubtopicIndex([tree])[q.subtopic_id] ?? null);
        } catch {
          setLabel(null);
        }
      }
      setPhase("ready");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setPhase("not_found");
        return;
      }
      notifyError(err);
      setPhase("error");
    }
  }, [id, notifyError]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const backLink = (
    <Link
      href="/review/queue"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {t("back_to_queue")}
    </Link>
  );

  if (authLoading || phase === "loading") {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {backLink}
        <ReviewSkeleton rows={4} />
      </div>
    );
  }

  if (phase === "not_found") {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {backLink}
        <ReviewEmptyState
          title={t("not_found_title")}
          description={t("not_found_desc")}
          headingLevel="h1"
        />
      </div>
    );
  }

  if (phase === "error" || !question) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {backLink}
        <ReviewErrorState
          title={t("detail_error_title")}
          description={t("detail_error_desc")}
          onRetry={() => void load()}
          headingLevel="h1"
        />
      </div>
    );
  }

  const claim = deriveClaimState(reviews, user?.id ?? null);
  const options = [...(question.options ?? [])].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  );
  const correct = options.find((o) => o.is_correct);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {backLink}

      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("detail_title")}
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            {question.id}
          </p>
        </div>
        <ReviewStatusBadge status={question.review_status} />
      </header>

      {/* Section B — Question (read-only) */}
      <Card>
        <CardContent className="space-y-5 p-6">
          <section aria-labelledby="q-heading" className="space-y-2">
            <h2 id="q-heading" className="text-sm font-semibold text-foreground">
              {t("question_heading")}
            </h2>
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {question.stem}
            </p>
          </section>

          <section aria-labelledby="opt-heading" className="space-y-2">
            <h2 id="opt-heading" className="text-sm font-semibold text-foreground">
              {t("options_heading")}
            </h2>
            <ul className="space-y-2">
              {options.map((o) => (
                <li
                  key={o.id}
                  className={cn(
                    "flex items-start gap-2 rounded-md border p-3 text-sm",
                    o.is_correct
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-border",
                  )}
                >
                  <span className="font-semibold text-muted-foreground">
                    {o.label}.
                  </span>
                  <span className="flex-1 text-foreground">{o.body}</span>
                  {o.is_correct && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      {t("correct_badge")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              {t("correct_answer_label")}:{" "}
              <span className="font-medium text-foreground">
                {correct ? correct.label : "—"}
              </span>
            </p>
          </section>

          <section aria-labelledby="exp-heading" className="space-y-2">
            <h2 id="exp-heading" className="text-sm font-semibold text-foreground">
              {t("explanation_heading")}
            </h2>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {question.explanation || t("explanation_empty")}
            </p>
          </section>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardContent className="p-6">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            {t("metadata_heading")}
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <Meta label={t("meta_subject")} value={label?.subject ?? "—"} />
            <Meta label={t("meta_topic")} value={label?.topic ?? "—"} />
            <Meta label={t("meta_difficulty")} value={String(question.difficulty)} />
            <Meta label={t("meta_language")} value={question.language} />
            <Meta
              label={t("meta_origin")}
              value={t(ORIGIN_KEY[question.origin] ?? "origin_manual")}
            />
            <Meta
              label={t("meta_created")}
              value={
                question.created_at
                  ? new Date(question.created_at).toLocaleDateString()
                  : "—"
              }
            />
          </dl>
        </CardContent>
      </Card>

      {/* Section C — Workflow actions (claim-gated) */}
      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-sm font-semibold text-foreground">
            {t("actions_heading")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {claim.isClaimed
              ? claim.isMine
                ? t("claim_status_mine")
                : t("claim_status_other", {
                    name: claim.claimedByName ?? "—",
                  })
              : t("claim_status_unclaimed")}
          </p>

          <div className="flex flex-wrap gap-2">
            {!claim.isClaimed && (
              <ClaimButton questionId={question.id} onDone={load} />
            )}
            {claim.isClaimed && claim.isMine && (
              <>
                <ApproveDialog
                  questionId={question.id}
                  status={question.review_status as ReviewStatus}
                  onDone={load}
                />
                <EscalateDialog questionId={question.id} onDone={load} />
                <RejectDialog questionId={question.id} onDone={load} />
                <ReleaseButton questionId={question.id} onDone={load} />
              </>
            )}
            {claim.isClaimed && !claim.isMine && (
              <p className="text-sm text-muted-foreground">
                {t("readonly_notice")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
