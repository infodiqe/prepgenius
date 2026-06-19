import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import as from "@/messages/as.json";
import hi from "@/messages/hi.json";

/**
 * Localization coverage — Sprint 1 · T13.
 * Every key the diagnostic entry consumes must exist and be non-empty in all
 * three supported locales (Assamese is the default).
 */
const REQUIRED_KEYS = [
  "title",
  "description",
  "cta",
  "launching",
  "launch_success",
] as const;

// T13.5 completion screen keys.
const REQUIRED_COMPLETE_KEYS = [
  "title_scored",
  "subtitle_scored",
  "title_pending",
  "subtitle_pending",
  "title_error",
  "subtitle_error",
  "loading",
  "pending_announce",
  "stat_score",
  "stat_accuracy",
  "stat_total",
  "stat_correct",
  "view_results",
  "go_dashboard",
  "refresh",
  "refreshing",
  "retry",
  "scored_success",
] as const;

const LOCALES: Record<
  string,
  { diagnostic: Record<string, string>; diagnostic_complete: Record<string, string> }
> = {
  en: en as never,
  as: as as never,
  hi: hi as never,
};

describe("diagnostic i18n key coverage", () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale} defines every required diagnostic key (non-empty)`, () => {
      for (const key of REQUIRED_KEYS) {
        const value = messages.diagnostic[key];
        expect(value, `${locale}.diagnostic.${key}`).toBeTruthy();
        expect(typeof value).toBe("string");
      }
    });

    it(`${locale} defines every required diagnostic_complete key (non-empty)`, () => {
      for (const key of REQUIRED_COMPLETE_KEYS) {
        const value = messages.diagnostic_complete[key];
        expect(value, `${locale}.diagnostic_complete.${key}`).toBeTruthy();
        expect(typeof value).toBe("string");
      }
    });
  }
});
