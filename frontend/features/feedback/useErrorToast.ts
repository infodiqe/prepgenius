"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  normalizeError,
  resolveErrorMessage,
  type AppError,
  type ErrorCategory,
} from "@/lib/errors";
import { toast, type ToastVariant } from "./useToast";

/**
 * Error → toast integration — Sprint 1 · T02.
 *
 * Bridges the (pure) error framework (`@/lib/errors`) to the T01 toast system.
 * Reusable from any feature (auth, registration, verification, profile, exam
 * selection, diagnostic launch, mock submission, future AI Tutor) without
 * duplicating toast logic.
 */

/** Map a category to the appropriate toast variant. */
export function variantForCategory(category: ErrorCategory): ToastVariant {
  switch (category) {
    case "validation":
    case "rate_limit":
    case "lockout":
      // User-actionable / transient → warning rather than hard error.
      return "warning";
    default:
      return "error";
  }
}

/**
 * Pure helper: classify a raw error and resolve a localized toast input.
 * Separated from the hook so it is unit-testable without rendering.
 */
export function errorToastInput(
  raw: unknown,
  t: (key: string) => string,
): { error: AppError; variant: ToastVariant; title: string } {
  const error = normalizeError(raw);
  return {
    error,
    variant: variantForCategory(error.category),
    title: resolveErrorMessage(error, t),
  };
}

/**
 * Hook: returns `notifyError(raw)` which classifies, localizes, and shows an
 * appropriate toast via T01. Returns the normalized {@link AppError} so callers
 * can also read `fieldErrors` for inline form display.
 */
export function useErrorToast() {
  const t = useTranslations("errors");
  return useCallback(
    (raw: unknown): AppError => {
      const { error, variant, title } = errorToastInput(raw, t);
      toast({ variant, title });
      return error;
    },
    [t],
  );
}
