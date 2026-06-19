import { z } from "zod";

/**
 * Verify-email form schema — Sprint 1 · T07.
 *
 * Mirrors the backend contracts the screen drives:
 *  - POST /api/v1/auth/verify-email/      → { token }
 *  - POST /api/v1/auth/resend-verification/ → { email }
 *
 * The token is always required to verify. The email is *optional in the schema*
 * (it is prefilled from the `?email=` query param and only needed for resend),
 * so a token-only verification submit is valid; resend validates email presence
 * separately. Messages are injected via a translator so they stay localized
 * (next-intl `auth` namespace) and the schema stays unit-testable without React.
 *
 * Presentation validation only — the backend remains the source of truth.
 */

export type VerifyEmailFormValues = {
  token: string;
  /** Prefilled from the registration redirect; required only for resend. */
  email: string;
};

/** Build a localized Zod schema. `t` is scoped to the `auth` namespace. */
export function buildVerifyEmailSchema(t: (key: string) => string) {
  return z.object({
    token: z.string().trim().min(1, t("val_token_required")),
    // Empty is allowed (token-only verify); a non-empty value must be valid.
    email: z.union([
      z.literal(""),
      z.string().trim().email(t("val_email_invalid")),
    ]),
  });
}

export type VerifyEmailSchema = ReturnType<typeof buildVerifyEmailSchema>;
