import { ApiError } from "./ApiError";
import { categorizeStatus, messageKeyForCategory } from "./classify";
import type { AppError, ErrorCategory } from "./types";

/**
 * Error normalizer — Sprint 1 · T02.
 *
 * Reduces any raw thrown value to a single {@link AppError}. Handles the
 * framework's {@link ApiError}, fetch `Response`-like objects, plain
 * `{ status, data }` shapes, network `TypeError`s, raw DRF bodies, and malformed
 * input — never throws.
 */

function toNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function extractFieldErrors(
  payload: unknown,
): Record<string, string[]> | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (key === "detail") continue;
    if (Array.isArray(value) && value.every((x) => typeof x === "string")) {
      out[key] = value as string[];
    } else if (typeof value === "string") {
      out[key] = [value];
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function isNetworkError(raw: unknown): boolean {
  if (!(raw instanceof Error)) return false;
  if (raw.name === "TypeError") return true; // fetch network failures are TypeErrors
  const message = raw.message?.toLowerCase() ?? "";
  return (
    message.includes("network") ||
    message.includes("failed to fetch") ||
    message.includes("load failed")
  );
}

function isPlainObject(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !(raw instanceof Error);
}

function build(
  category: ErrorCategory,
  status: number | null,
  payload: unknown,
  raw: unknown,
): AppError {
  const fieldErrors = extractFieldErrors(payload);
  return {
    category,
    code: category,
    status,
    messageKey: messageKeyForCategory(category),
    ...(fieldErrors ? { fieldErrors } : {}),
    rawPayload: raw,
  };
}

export function normalizeError(raw: unknown): AppError {
  // 1) Framework's structured ApiError (preferred input).
  if (raw instanceof ApiError) {
    return build(categorizeStatus(raw.status), raw.status, raw.payload, raw);
  }

  // 2) Fetch Response or any object carrying a `status` (+ optional body).
  if (isPlainObject(raw) && "status" in raw) {
    const status = toNumberOrNull(raw.status);
    const payload = raw.data ?? raw.payload ?? raw.body;
    const category = status === null ? "unknown" : categorizeStatus(status);
    return build(category, status, payload, raw);
  }

  // 3) Network failure surfaced as a thrown Error (fetch TypeError, etc.).
  if (isNetworkError(raw)) {
    return build("network", null, undefined, raw);
  }

  // 4) Plain object without a status (e.g. a raw DRF body) — unknown category,
  //    but still surface any field errors for form consumption.
  if (isPlainObject(raw)) {
    return build("unknown", null, raw, raw);
  }

  // 5) Everything else (generic Error, string, null, number) → unknown.
  return build("unknown", null, undefined, raw);
}
