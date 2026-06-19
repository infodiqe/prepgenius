import type { ErrorCategory } from "./types";

/**
 * Error classification utilities — Sprint 1 · T02.
 * Maps HTTP status → category, and category → its i18n message key.
 */

const MESSAGE_KEY: Record<ErrorCategory, string> = {
  validation: "validation",
  authentication: "authentication",
  authorization: "authorization",
  not_found: "notFound",
  conflict: "conflict",
  lockout: "lockout",
  rate_limit: "rateLimit",
  server: "server",
  network: "network",
  unknown: "unknown",
};

/** The `errors` i18n leaf key for a category. */
export function messageKeyForCategory(category: ErrorCategory): string {
  return MESSAGE_KEY[category];
}

/**
 * Classify an HTTP status into an {@link ErrorCategory}.
 * `null`/`0` (no response) → `network`; unmapped 4xx → `unknown`.
 */
export function categorizeStatus(status: number | null): ErrorCategory {
  if (status === null || status === 0) return "network";
  switch (status) {
    case 400:
      return "validation";
    case 401:
      return "authentication";
    case 403:
      return "authorization";
    case 404:
      return "not_found";
    case 409:
      return "conflict";
    case 423:
      return "lockout";
    case 429:
      return "rate_limit";
    default:
      break;
  }
  if (status >= 500) return "server";
  return "unknown";
}
