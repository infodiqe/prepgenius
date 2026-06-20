"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { ReviewStatus } from "./reviewService";

/*
 * ReviewCard — presentational summary of a single question for the Review Board.
 * Pure (no data fetching). Used as the question recap on the detail page and as
 * a standalone summary. Status labels are localized via the `review` namespace.
 */

const STATUS_KEY: Record<string, string> = {
  draft: "status_draft",
  in_review: "status_in_review",
  sme_review: "status_sme_review",
  approved: "status_approved",
  published: "status_published",
  rejected: "status_rejected",
};

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  in_review: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  sme_review: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  approved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  published: "bg-primary/15 text-primary",
  rejected: "bg-destructive/15 text-destructive",
};

/** Localized, colour-coded review-status badge. Reused by the queue table. */
export function ReviewStatusBadge({ status }: { status: string }) {
  const t = useTranslations("review");
  const labelKey = STATUS_KEY[status] ?? "status_draft";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_CLASS[status] ?? STATUS_CLASS.draft,
      )}
    >
      {t(labelKey)}
    </span>
  );
}

export interface ReviewCardQuestion {
  id: string;
  stem: string;
  review_status: ReviewStatus | string;
  created_at?: string;
}

export interface ReviewCardProps {
  question: ReviewCardQuestion;
  subject?: string | null;
  topic?: string | null;
  claimedByName?: string | null;
}

export function ReviewCard({
  question,
  subject,
  topic,
  claimedByName,
}: ReviewCardProps) {
  const t = useTranslations("review");
  const shortId = question.id.slice(0, 8);
  const created = question.created_at
    ? new Date(question.created_at).toLocaleDateString()
    : "—";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-mono text-xs text-muted-foreground">{shortId}</p>
          <p className="line-clamp-2 text-sm font-medium text-foreground">
            {question.stem}
          </p>
        </div>
        <ReviewStatusBadge status={question.review_status} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
        <div>
          <dt className="font-medium">{t("col_subject")}</dt>
          <dd>{subject ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium">{t("col_topic")}</dt>
          <dd>{topic ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium">{t("col_claimed_by")}</dt>
          <dd>{claimedByName ?? t("not_claimed")}</dd>
        </div>
        <div>
          <dt className="font-medium">{t("col_created")}</dt>
          <dd>{created}</dd>
        </div>
      </dl>
    </div>
  );
}
