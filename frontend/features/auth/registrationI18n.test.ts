import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import as from "@/messages/as.json";
import hi from "@/messages/hi.json";

/**
 * Localization coverage — Sprint 1 · T05a.
 * Every auth key the registration form consumes must exist and be non-empty in
 * all three supported locales (Assamese is the default), so no UI string falls
 * back to a raw key at runtime.
 */
const REQUIRED_AUTH_KEYS = [
  // Labels / actions
  "name",
  "email",
  "password",
  "confirm_password",
  "phone",
  "phone_optional_hint",
  "preferred_language",
  "register",
  "register_title",
  "register_subtitle",
  "creating_account",
  "show_password",
  "hide_password",
  "have_account",
  "login",
  "success_register",
  // Validation messages
  "val_name_required",
  "val_email_required",
  "val_email_invalid",
  "val_phone_invalid",
  "val_password_required",
  "val_password_min",
  "val_password_confirm_required",
  "passwords_do_not_match",
] as const;

const LOCALES: Record<string, { auth: Record<string, string> }> = {
  en: en as never,
  as: as as never,
  hi: hi as never,
};

describe("registration i18n key coverage", () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale} defines every required auth key (non-empty)`, () => {
      for (const key of REQUIRED_AUTH_KEYS) {
        const value = messages.auth[key];
        expect(value, `${locale}.auth.${key}`).toBeTruthy();
        expect(typeof value).toBe("string");
      }
    });
  }

  it("does not introduce consent strings (deferred to T06)", () => {
    for (const messages of Object.values(LOCALES)) {
      expect(
        Object.keys(messages.auth).some((k) => k.toLowerCase().includes("consent")),
      ).toBe(false);
    }
  });
});
