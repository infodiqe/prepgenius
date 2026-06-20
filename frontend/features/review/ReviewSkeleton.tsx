"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui";

/**
 * T03 loading state for the Review Board (queue + detail share it).
 * Exposes role="status" + an aria-label so screen readers announce loading.
 */
export function ReviewSkeleton({ rows = 6 }: { rows?: number }) {
  const t = useTranslations("review");
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t("loading")}
      className="space-y-3"
    >
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
      <span className="sr-only">{t("loading")}</span>
    </div>
  );
}
