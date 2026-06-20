"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useErrorToast } from "@/features/feedback/useErrorToast";
import {
  listReviewQuestions,
  getExamTree,
  buildSubtopicIndex,
  type QuestionListItem,
  type SubtopicLabel,
  type ReviewStatus,
} from "./reviewService";
import { ReviewQueueTable } from "./ReviewQueueTable";
import { ReviewSkeleton } from "./ReviewSkeleton";
import { ReviewEmptyState } from "./ReviewEmptyState";
import { ReviewErrorState } from "./ReviewErrorState";

/*
 * Review Board — queue (Section A). Lists the review pipeline from the existing
 * questions endpoint; status filtering and free-text search are client-side
 * presentation over the fetched rows (the backend stays the source of truth).
 */

type Phase = "loading" | "ready" | "error";

const STATUS_FILTERS: Array<{ value: "all" | ReviewStatus; key: string }> = [
  { value: "all", key: "filter_all" },
  { value: "draft", key: "status_draft" },
  { value: "in_review", key: "status_in_review" },
  { value: "sme_review", key: "status_sme_review" },
  { value: "approved", key: "status_approved" },
  { value: "rejected", key: "status_rejected" },
];

export function ReviewQueuePage() {
  const t = useTranslations("review");
  const notifyError = useErrorToast();

  const [phase, setPhase] = React.useState<Phase>("loading");
  const [questions, setQuestions] = React.useState<QuestionListItem[]>([]);
  const [subtopicIndex, setSubtopicIndex] = React.useState<
    Record<string, SubtopicLabel>
  >({});
  const [status, setStatus] = React.useState<"all" | ReviewStatus>("all");
  const [search, setSearch] = React.useState("");

  const load = React.useCallback(async () => {
    setPhase("loading");
    try {
      const list = await listReviewQuestions();
      // Resolve subject/topic names via one exam-tree call per distinct exam.
      const examIds = Array.from(
        new Set(list.map((q) => q.exam_id).filter(Boolean) as string[]),
      );
      const trees = await Promise.all(
        examIds.map((id) => getExamTree(id).catch(() => null)),
      );
      setQuestions(list);
      setSubtopicIndex(
        buildSubtopicIndex(trees.filter((tree): tree is NonNullable<typeof tree> => tree !== null)),
      );
      setPhase("ready");
    } catch (err) {
      notifyError(err);
      setPhase("error");
    }
  }, [notifyError]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const visible = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return questions.filter((q) => {
      if (status !== "all" && q.review_status !== status) return false;
      if (!term) return true;
      return (
        q.id.toLowerCase().includes(term) ||
        q.stem.toLowerCase().includes(term)
      );
    });
  }, [questions, status, search]);

  const heading = (
    <header className="space-y-1">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        {t("title")}
      </h1>
      <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
    </header>
  );

  if (phase === "loading") {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {heading}
        <ReviewSkeleton />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {heading}
        <ReviewErrorState
          title={t("error_title")}
          description={t("error_desc")}
          onRetry={() => void load()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {heading}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full max-w-xs space-y-1">
          <label htmlFor="review-search" className="text-sm font-medium text-foreground">
            {t("search_label")}
          </label>
          <Input
            id="review-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search_placeholder")}
          />
        </div>

        <div
          role="group"
          aria-label={t("filter_label")}
          className="flex flex-wrap gap-2"
        >
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={status === f.value}
              onClick={() => setStatus(f.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                status === f.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              {t(f.key)}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <ReviewEmptyState
          title={t("empty_title")}
          description={t("empty_desc")}
        />
      ) : (
        <ReviewQueueTable questions={visible} subtopicIndex={subtopicIndex} />
      )}
    </div>
  );
}
