"use client";

import React from "react";
import { ErrorState } from "@/components/ui";

/*
 * Student route-group error boundary (SPRINT-5B-01).
 *
 * Catches unexpected render/runtime throws anywhere in the (student) tree —
 * which previously fell through to the unstyled Next.js default — and shows the
 * localized ErrorState. `reset` re-renders the segment, so it doubles as Retry.
 */
export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Student route error:", error);
  }, [error]);

  return (
    <div className="px-4 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <ErrorState onRetry={reset} headingLevel="h1" />
      </div>
    </div>
  );
}
