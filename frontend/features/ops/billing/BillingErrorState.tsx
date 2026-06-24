import React from "react";
import { Button } from "@/components/ui";

/**
 * BillingErrorState — OPS-07 (Part F).
 *
 * Unified Error / Unauthorized / Forbidden surfaces (reusing the Ops notice
 * pattern). 401/403 carry no retry — they reflect the RBAC-gated API responses,
 * the server being the source of truth. Presentational; English-only.
 */
export type BillingErrorVariant = "error" | "unauthorized" | "forbidden";

const COPY: Record<BillingErrorVariant, { title: string; body: string }> = {
  error: {
    title: "Could not load credits",
    body: "Something went wrong while fetching from the server.",
  },
  unauthorized: {
    title: "Sign in required",
    body: "Your session has expired. Please sign in again.",
  },
  forbidden: {
    title: "Access denied",
    body: "Your role does not have access to billing and credits.",
  },
};

export function BillingErrorState({
  variant,
  onRetry,
}: {
  variant: BillingErrorVariant;
  onRetry?: () => void;
}) {
  const { title, body } = COPY[variant];
  const showRetry = variant === "error" && Boolean(onRetry);
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-8 text-center"
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
      {showRetry && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
