import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import as from "@/messages/as.json";
import hi from "@/messages/hi.json";

/**
 * Localization coverage — Sprint 4 · T21.
 * Every key the history experience consumes must exist and be non-empty in all
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
  "history_title",
  "history_subtitle",
  "history_empty_title",
  "history_empty_desc",
  "history_date",
  "history_score",
  "history_accuracy",
  "history_correct",
  "history_submitted",
  "type_full_mock",
  "type_previous_year",
  "type_mixed",
  "type_topic",
  "type_subject",
  "type_daily",
  "recent_title",
  "recent_subtitle",
  "recent_empty_title",
  "recent_empty_desc",
  "recent_item",
  "recent_aria",
  "weak_title",
  "weak_subtitle",
  "weak_filter_label",
  "weak_filter_all",
  "severity_high",
  "severity_medium",
  "severity_low",
  "weak_empty_title",
  "weak_empty_desc",
  "weak_accuracy",
  "view_all",
  "show_less",
  "back_to_history",
  "detail_title",
  "detail_error_title",
  "detail_error_desc",
  "pass_status_pass",
  "pass_status_needs_work",
  "stat_score",
  "stat_accuracy",
  "stat_correct",
  "stat_incorrect",
  "subjects_title",
  "subjects_empty_desc",
  "topics_title",
  "topics_empty_desc",
] as const;

const LOCALES: Record<string, { history: Record<string, string> }> = {
  en: en as never,
  as: as as never,
  hi: hi as never,
};

describe("history i18n key coverage", () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale} defines every required history key (non-empty)`, () => {
      for (const key of REQUIRED_KEYS) {
        const value = messages.history[key];
        expect(value, `${locale}.history.${key}`).toBeTruthy();
        expect(typeof value).toBe("string");
      }
    });
  }
});
