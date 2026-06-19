import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import as from "@/messages/as.json";
import hi from "@/messages/hi.json";

/**
 * Localization coverage — Sprint 1 · T07.
 * Every auth key the verify-email screen consumes must exist and be non-empty in
 * all three supported locales (Assamese is the default), so no UI string falls
 * back to a raw key at runtime.
 */
const REQUIRED_AUTH_KEYS = [
  // Headings / labels / actions
  "verify_email_title",
  "verify_email_subtitle",
  "verify_token",
  "verify_token_placeholder",
  "email",
  "email_for_resend",
  "submit",
  "verifying",
  "resend_verification",
  "resending",
  "back_to_login",
  // Feedback (T01 toasts)
  "success_verify",
  "success_resend",
  // Validation
  "val_token_required",
  "val_email_required",
  "val_email_invalid",
] as const;

const LOCALES: Record<string, { auth: Record<string, string> }> = {
  en: en as never,
  as: as as never,
  hi: hi as never,
};

describe("verify-email i18n key coverage", () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale} defines every required auth key (non-empty)`, () => {
      for (const key of REQUIRED_AUTH_KEYS) {
        const value = messages.auth[key];
        expect(value, `${locale}.auth.${key}`).toBeTruthy();
        expect(typeof value).toBe("string");
      }
    });
  }
});
