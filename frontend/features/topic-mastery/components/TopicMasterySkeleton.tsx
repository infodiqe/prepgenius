"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui";

/* Loading placeholder for the topic mastery dashboard (T03). Single live region. */
export function TopicMasterySkeleton({ cards = 4 }: { cards?: number }) {
  const t = useTranslations("topic_mastery");
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="space-y-4">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="space-y-4 rounded-lg border bg-card p-6 shadow-sm"
        >
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-2 w-full" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      ))}
      <span className="sr-only">{t("loading")}</span>
    </div>
  );
}
