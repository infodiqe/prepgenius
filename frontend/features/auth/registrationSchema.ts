import { z } from "zod";

/**
 * Registration form schema — Sprint 1 · T05a.
 *
 * Mirrors the backend `RegistrationRequest` contract
 * (POST /api/v1/auth/register/): email, full_name, password, password_confirm,
 * phone_e164 (optional), preferred_language. Validation messages are injected
 * via a translator so they stay localized (next-intl `auth` namespace) and the
 * schema stays unit-testable without React.
 *
 * Note: this is *presentation* validation only (format/required/match) — the
 * backend remains the source of truth for auth rules and uniqueness.
 */

export const PREFERRED_LANGUAGES = ["as", "en", "hi"] as const;
export type PreferredLanguage = (typeof PREFERRED_LANGUAGES)[number];

export const PASSWORD_MIN_LENGTH = 8;

// E.164: leading "+", country digit 1-9, then up to 14 more digits.
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export type RegistrationFormValues = {
  full_name: string;
  email: string;
  phone_e164?: string;
  password: string;
  password_confirm: string;
  preferred_language: PreferredLanguage;
};

/** Build a localized Zod schema. `t` is scoped to the `auth` namespace. */
export function buildRegistrationSchema(t: (key: string) => string) {
  return z
    .object({
      full_name: z.string().trim().min(1, t("val_name_required")),
      email: z
        .string()
        .trim()
        .min(1, t("val_email_required"))
        .email(t("val_email_invalid")),
      phone_e164: z
        .string()
        .trim()
        .optional()
        .refine((v) => !v || E164_PATTERN.test(v), {
          message: t("val_phone_invalid"),
        }),
      password: z
        .string()
        .min(1, t("val_password_required"))
        .min(PASSWORD_MIN_LENGTH, t("val_password_min")),
      password_confirm: z.string().min(1, t("val_password_confirm_required")),
      preferred_language: z.enum(PREFERRED_LANGUAGES),
    })
    .refine((data) => data.password === data.password_confirm, {
      path: ["password_confirm"],
      message: t("passwords_do_not_match"),
    });
}

export type RegistrationSchema = ReturnType<typeof buildRegistrationSchema>;
