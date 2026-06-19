import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import as from "@/messages/as.json";
import hi from "@/messages/hi.json";

/**
 * Localization coverage — Sprint 1 · T09.
 * Every key the onboarding wizard consumes must exist and be non-empty in all
 * three supported locales (Assamese is the default), so no UI string falls back
 * to a raw key at runtime.
 */
const REQUIRED_KEYS = [
  "subtitle",
  "step_of",
  "step1_title",
  "step2_title",
  "step3_title",
  "exam_label",
  "exam_placeholder",
  "exam_help",
  "date_label",
  "date_help",
  "review_title",
  "review_exam_label",
  "review_date_label",
  "edit",
  "back",
  "next",
  "save",
  "saving",
  "success",
  "val_exam_required",
  "val_date_required",
  "val_date_past",
  "no_exams_title",
  "no_exams_desc",
] as const;

const LOCALES: Record<string, { onboarding: Record<string, string> }> = {
  en: en as never,
  as: as as never,
  hi: hi as never,
};

describe("onboarding i18n key coverage", () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale} defines every required onboarding key (non-empty)`, () => {
      for (const key of REQUIRED_KEYS) {
        const value = messages.onboarding[key];
        expect(value, `${locale}.onboarding.${key}`).toBeTruthy();
        expect(typeof value).toBe("string");
      }
    });
  }
});
