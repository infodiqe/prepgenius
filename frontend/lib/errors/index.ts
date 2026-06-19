/**
 * API error handling framework — Sprint 1 · T02.
 *
 * Layered: Raw API Error → normalizeError → (category/status/messageKey) →
 * resolveErrorMessage → toast/UI. The toast integration lives in
 * `@/features/feedback/useErrorToast` (T01).
 */
export type { AppError, ErrorCategory } from "./types";
export { ApiError } from "./ApiError";
export { categorizeStatus, messageKeyForCategory } from "./classify";
export { normalizeError } from "./normalize";
export { resolveErrorMessage } from "./resolveMessage";
