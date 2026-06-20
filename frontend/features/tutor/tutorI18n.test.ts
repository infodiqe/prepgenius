import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import as from "@/messages/as.json";
import hi from "@/messages/hi.json";

/**
 * Localization coverage — Sprint 4 · T30A (AI Tutor shell).
 * Every key the AI Tutor shell consumes must exist and be non-empty in all
 * three supported locales (Assamese is the default).
 */
const REQUIRED_KEYS = [
  "title",
  "subtitle",
  "coming_soon_title",
  "coming_soon_description",
  "language",
  "history_placeholder",
  "input_placeholder",
  "ask_tutor",
  "future_capabilities",
  "explain_answers",
  "explain_concepts",
  "translate_explanations",
  "follow_up_questions",
] as const;

const LOCALES: Record<string, { tutor: Record<string, string> }> = {
  en: en as never,
  as: as as never,
  hi: hi as never,
};

describe("tutor i18n key coverage", () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale} defines every required tutor key (non-empty)`, () => {
      for (const key of REQUIRED_KEYS) {
        const value = messages.tutor[key];
        expect(value, `${locale}.tutor.${key}`).toBeTruthy();
        expect(typeof value).toBe("string");
      }
    });
  }
});
