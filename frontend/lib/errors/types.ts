/**
 * Central error model — Sprint 1 · T02.
 *
 * The normalized shape every backend/API error is reduced to, regardless of the
 * raw input. Consumed by the localized message resolver and the toast helper.
 */

export type ErrorCategory =
  | "validation"
  | "authentication"
  | "authorization"
  | "not_found"
  | "conflict"
  | "lockout"
  | "rate_limit"
  | "server"
  | "network"
  | "unknown";

export interface AppError {
  /** Stable category used for branching/handling. */
  category: ErrorCategory;
  /** Machine code (mirrors `category`) — a stable seam for logging/telemetry. */
  code: ErrorCategory;
  /** HTTP status when known; `null` for network/unknown failures. */
  status: number | null;
  /** i18n leaf key within the `errors` namespace (resolved at the UI layer). */
  messageKey: string;
  /** Field-level validation errors (e.g. DRF 400), when present. */
  fieldErrors?: Record<string, string[]>;
  /** The original raw payload/error, retained for debugging. */
  rawPayload: unknown;
}
