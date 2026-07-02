import React from "react";
import { Skeleton, SkeletonCard } from "@/components/ui";

/*
 * Profile route loading boundary (SPRINT-5B-01).
 *
 * The profile page awaits four parallel server fetches (profile, exams, credit
 * balance, credit ledger) with no Suspense, so the whole screen — including the
 * tabs that need no remote data — blanked until the slowest call resolved. This
 * boundary shows a skeleton immediately, reusing the shared Skeleton primitives.
 */
export default function ProfileLoading() {
  return (
    <main className="space-y-6 pb-12" role="status" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-11 w-full max-w-lg" />
      <SkeletonCard />
      <span className="sr-only">Loading…</span>
    </main>
  );
}
