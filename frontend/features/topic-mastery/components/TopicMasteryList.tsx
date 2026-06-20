"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui";
import type { TopicPerformance } from "@/features/topic-mastery/topicMasteryService";
import { TopicMasteryCard } from "./TopicMasteryCard";

/*
 * Topic Mastery List — Sprint 4 · T26.
 *
 * Sort controls + list of cards. Sorting only re-orders backend rows by a
 * backend field (success_rate, attempts, last_practiced_at); no ranking or
 * metric is computed. All descending.
 */

type SortKey = "success_rate" | "attempts" | "last_practiced_at";

const SORTS: { key: SortKey; labelKey: string }[] = [
  { key: "success_rate", labelKey: "sort_success_rate" },
  { key: "attempts", labelKey: "sort_attempts" },
  { key: "last_practiced_at", labelKey: "sort_recent" },
];

function toNumber(value: string | null): number {
  const n = value == null ? 0 : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function sortTopics(topics: TopicPerformance[], key: SortKey): TopicPerformance[] {
  const copy = [...topics];
  if (key === "attempts") {
    copy.sort((a, b) => b.attempts - a.attempts);
  } else if (key === "last_practiced_at") {
    copy.sort((a, b) => {
      const ta = a.last_practiced_at ? Date.parse(a.last_practiced_at) : -Infinity;
      const tb = b.last_practiced_at ? Date.parse(b.last_practiced_at) : -Infinity;
      return tb - ta;
    });
  } else {
    copy.sort((a, b) => toNumber(b.success_rate) - toNumber(a.success_rate));
  }
  return copy;
}

export function TopicMasteryList({ topics }: { topics: TopicPerformance[] }) {
  const t = useTranslations("topic_mastery");
  const [sortKey, setSortKey] = React.useState<SortKey>("success_rate");

  const sorted = React.useMemo(() => sortTopics(topics, sortKey), [topics, sortKey]);

  return (
    <section aria-label={t("list_label")} className="space-y-4">
      <div role="group" aria-label={t("sort_label")} className="flex flex-wrap gap-2">
        <span className="self-center text-xs font-medium text-muted-foreground">
          {t("sort_label")}
        </span>
        {SORTS.map(({ key, labelKey }) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={sortKey === key ? "default" : "outline"}
            aria-pressed={sortKey === key}
            onClick={() => setSortKey(key)}
          >
            {t(labelKey)}
          </Button>
        ))}
      </div>

      <ul className="space-y-4">
        {sorted.map((topic) => (
          <li key={topic.topic_id}>
            <TopicMasteryCard topic={topic} />
          </li>
        ))}
      </ul>
    </section>
  );
}
