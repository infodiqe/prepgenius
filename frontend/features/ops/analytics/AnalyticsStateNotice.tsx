import React from "react";
import { Button, Skeleton } from "@/components/ui";
import type { AnalyticsPhase } from "./analyticsService";

/**
 * AnalyticsStateNotice — OPS-08 shared non-ready surface.
 *
 * Renders the loading / error / unauthorized / forbidden states the analytics
 * panels share, so each panel only implements its own ready/empty content.
 * 401/403 carry no retry — they reflect the RBAC-gated API, the server being the
 * source of truth. Returns `null` for "ready" (the panel renders its content).
 * Semantic tokens only; English-only.
 */
const COPY: Record<
  Exclude<AnalyticsPhase, "loading" | "ready">,
  { title: string; body: string }
> = {
  error: {
    title: "Could not load analytics",
    body: "Something went wrong while fetching from the server.",
  },
  unauthorized: {
    title: "Sign in required",
    body: "Your session has expired. Please sign in again.",
  },
  forbidden: {
    title: "Access denied",
    body: "Your role does not have access to analytics.",
  },
};

export function AnalyticsStateNotice({
  phase,
  onRetry,
  loadingLabel = "Loading analytics",
  rows = 3,
}: {
  phase: AnalyticsPhase;
  onRetry?: () => void;
  loadingLabel?: string;
  rows?: number;
}) {
  if (phase === "ready") return null;

  if (phase === "loading") {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label={loadingLabel}
        className="space-y-2"
      >
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  const { title, body } = COPY[phase];
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 text-center"
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
      {phase === "error" && onRetry && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
