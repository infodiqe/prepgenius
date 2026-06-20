import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import as from "@/messages/as.json";
import hi from "@/messages/hi.json";

/**
 * Localization coverage — Review Board (T31).
 * Every key the review experience consumes must exist and be a non-empty string
 * in all three supported locales (Assamese is the default). The English
 * namespace is the source of truth for the required key set.
 */
const REQUIRED_KEYS = Object.keys(
  (en as { review: Record<string, string> }).review,
);

const LOCALES: Record<string, { review: Record<string, string> }> = {
  en: en as never,
  as: as as never,
  hi: hi as never,
};

describe("review i18n key coverage", () => {
  it("English defines a non-trivial review namespace", () => {
    expect(REQUIRED_KEYS.length).toBeGreaterThan(50);
  });

  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale} defines every required review key (non-empty string)`, () => {
      for (const key of REQUIRED_KEYS) {
        const value = messages.review[key];
        expect(value, `${locale}.review.${key}`).toBeTruthy();
        expect(typeof value, `${locale}.review.${key}`).toBe("string");
      }
    });
  }
});
