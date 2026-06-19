import type { AppError } from "./types";

/**
 * Localized message resolver — Sprint 1 · T02.
 *
 * Resolves the user-facing message from an {@link AppError} using an injected
 * translator (e.g. `useTranslations("errors")`). Decoupled from React/next-intl
 * so it is unit-testable and usable in any context. We intentionally return the
 * *localized category message* rather than the raw backend `detail` (which is
 * not localized and may leak technical text). Field-level errors live on
 * `error.fieldErrors` for form display.
 */
export function resolveErrorMessage(
  error: AppError,
  t: (key: string) => string,
): string {
  return t(error.messageKey);
}
