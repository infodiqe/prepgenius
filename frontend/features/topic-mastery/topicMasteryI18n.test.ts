import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import as from "@/messages/as.json";
import hi from "@/messages/hi.json";

/**
 * Localization coverage — Sprint 4 · T26.
 * Every key the topic mastery dashboard consumes must exist and be non-empty in
 * all three supported locales (Assamese is the default).
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
  "list_label",
  "sort_label",
  "sort_success_rate",
  "sort_attempts",
  "sort_recent",
  "stat_attempts",
  "stat_correct",
  "stat_avg_time",
  "stat_last_practiced",
  "success_aria",
  "avg_time_value",
  "never",
] as const;

const LOCALES: Record<string, { topic_mastery: Record<string, string> }> = {
  en: en as never,
  as: as as never,
  hi: hi as never,
};

describe("topic mastery i18n key coverage", () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale} defines every required topic_mastery key (non-empty)`, () => {
      for (const key of REQUIRED_KEYS) {
        const value = messages.topic_mastery[key];
        expect(value, `${locale}.topic_mastery.${key}`).toBeTruthy();
        expect(typeof value).toBe("string");
      }
    });
  }
});
