"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui";

/* Loading placeholder for the trends dashboard (T03). Single live region. */
export function TrendSkeleton({ blocks = 4 }: { blocks?: number }) {
  const t = useTranslations("trends");
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="space-y-6">
      {Array.from({ length: blocks }).map((_, i) => (
        <div
          key={i}
          className="space-y-4 rounded-lg border bg-card p-6 shadow-sm"
        >
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
      <span className="sr-only">{t("loading")}</span>
    </div>
  );
}
