import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import as from "@/messages/as.json";
import hi from "@/messages/hi.json";

/**
 * Localization coverage — Sprint 4 · T20.
 * Every key the readiness dashboard consumes must exist and be non-empty in all
 * three supported locales (Assamese is the default).
 */
const REQUIRED_KEYS = [
  "title",
  "subtitle",
  "score_title",
  "score_unavailable",
  "score_provisional",
  "score_aria",
  "score_updated",
  "breakdown_title",
  "band_needs_improvement",
  "band_developing",
  "band_on_track",
  "band_exam_ready",
  "comp_mock_performance",
  "comp_subject_accuracy",
  "comp_topic_accuracy",
  "comp_consistency",
  "comp_practice_completion",
  "subjects_title",
  "subjects_subtitle",
  "subjects_empty_title",
  "subjects_empty_desc",
  "subject_meta",
  "subject_aria",
  "weak_title",
  "weak_subtitle",
  "weak_priority",
  "weak_accuracy",
  "weak_empty_title",
  "weak_empty_desc",
  "view_all",
  "show_less",
  "reco_title",
  "reco_subtitle",
  "reco_empty_title",
  "reco_empty_desc",
  "loading",
  "error_title",
  "error_desc",
  "retry",
  "no_exam_title",
  "no_exam_desc",
] as const;

const LOCALES: Record<string, { readiness: Record<string, string> }> = {
  en: en as never,
  as: as as never,
  hi: hi as never,
};

describe("readiness i18n key coverage", () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale} defines every required readiness key (non-empty)`, () => {
      for (const key of REQUIRED_KEYS) {
        const value = messages.readiness[key];
        expect(value, `${locale}.readiness.${key}`).toBeTruthy();
        expect(typeof value).toBe("string");
      }
    });
  }
});
