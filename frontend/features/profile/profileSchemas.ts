import { z } from "zod";

import { todayIso } from "@/features/onboarding/onboardingSchema";

export const PROFILE_LANGUAGES = ["as", "en", "hi"] as const;
export type ProfileLanguage = (typeof PROFILE_LANGUAGES)[number];

export type ProfileDetailsValues = {
  full_name: string;
  phone_e164: string;
  preferred_language: ProfileLanguage;
};

export type ExamPreferencesValues = {
  target_exam_id: string;
  exam_date: string;
};

export function buildProfileDetailsSchema(t: (key: string) => string) {
  return z.object({
    full_name: z.string().trim().min(1, t("profile.name_required")),
    phone_e164: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || /^\+[0-9]+$/.test(value),
        t("profile.phone_invalid"),
      ),
    preferred_language: z.enum(PROFILE_LANGUAGES),
  });
}

export function buildExamPreferencesSchema(
  t: (key: string) => string,
  now: Date = new Date(),
) {
  const today = todayIso(now);
  return z.object({
    target_exam_id: z.string().trim().min(1, t("exam.exam_required")),
    exam_date: z
      .string()
      .trim()
      .refine((value) => value === "" || value >= today, {
        message: t("exam.date_past"),
      }),
  });
}

