"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ReviewStatusBadge } from "./ReviewCard";
import type { QuestionListItem, SubtopicLabel } from "./reviewService";

/*
 * ReviewQueueTable — semantic <table> listing of the review pipeline.
 * Each row links to the question detail. Subject/Topic are resolved from the
 * exam-tree index; Claimed By is not available at list scope (see T31 risks).
 */

export interface ReviewQueueTableProps {
  questions: QuestionListItem[];
  subtopicIndex: Record<string, SubtopicLabel>;
}

function snippet(stem: string): string {
  const trimmed = stem.trim();
  return trimmed.length > 90 ? `${trimmed.slice(0, 90)}…` : trimmed;
}

export function ReviewQueueTable({
  questions,
  subtopicIndex,
}: ReviewQueueTableProps) {
  const t = useTranslations("review");

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <caption className="sr-only">{t("title")}</caption>
        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">{t("col_id")}</th>
            <th scope="col" className="px-3 py-2 font-medium">{t("col_question")}</th>
            <th scope="col" className="px-3 py-2 font-medium">{t("col_subject")}</th>
            <th scope="col" className="px-3 py-2 font-medium">{t("col_topic")}</th>
            <th scope="col" className="px-3 py-2 font-medium">{t("col_status")}</th>
            <th scope="col" className="px-3 py-2 font-medium">{t("col_claimed_by")}</th>
            <th scope="col" className="px-3 py-2 font-medium">{t("col_created")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {questions.map((q) => {
            const label = q.subtopic_id
              ? subtopicIndex[q.subtopic_id]
              : undefined;
            const created = q.created_at
              ? new Date(q.created_at).toLocaleDateString()
              : "—";
            return (
              <tr key={q.id} className="hover:bg-muted/40">
                <th scope="row" className="px-3 py-2 font-mono text-xs font-normal text-muted-foreground">
                  <Link
                    href={`/review/${q.id}`}
                    className="rounded underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={t("open_question", { id: q.id.slice(0, 8) })}
                  >
                    {q.id.slice(0, 8)}
                  </Link>
                </th>
                <td className="max-w-[320px] px-3 py-2 text-foreground">
                  {snippet(q.stem)}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {label?.subject ?? "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {label?.topic ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <ReviewStatusBadge status={q.review_status} />
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {t("not_claimed")}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{created}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
