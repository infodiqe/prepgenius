import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import as from "@/messages/as.json";
import hi from "@/messages/hi.json";

/**
 * Localization coverage — Sprint 4 · T27.
 * Every key the trends dashboard consumes must exist and be non-empty in all
 * three supported locales (Assamese is the default).
 */
const REQUIRED_KEYS = [
  "title",
  "subtitle",
  "loading",
  "retry",
  "no_exam_title",
  "no_exam_desc",
  "error_title",
  "error_desc",
  "empty_title",
  "empty_desc",
  "overall_title",
  "overall_subtitle",
  "overall_empty",
  "col_date",
  "col_score",
  "col_accuracy",
  "readiness_title",
  "readiness_subtitle",
  "readiness_empty",
  "band_needs_improvement",
  "band_developing",
  "band_on_track",
  "band_exam_ready",
  "subjects_title",
  "subjects_subtitle",
  "subjects_empty",
  "topics_title",
  "topics_subtitle",
  "topics_empty",
  "history_aria",
] as const;

const LOCALES: Record<string, { trends: Record<string, string> }> = {
  en: en as never,
  as: as as never,
  hi: hi as never,
};

describe("trends i18n key coverage", () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale} defines every required trends key (non-empty)`, () => {
      for (const key of REQUIRED_KEYS) {
        const value = messages.trends[key];
        expect(value, `${locale}.trends.${key}`).toBeTruthy();
        expect(typeof value).toBe("string");
      }
    });
  }
});
