import { z } from "zod";

/**
 * Onboarding wizard schema — Sprint 1 · T09.
 *
 * Drives the profile-completion wizard that persists via
 * PATCH /api/v1/auth/profile/ (fields: target_exam_id, exam_date). Both are
 * collected here as dedicated steps, so both are required to finish onboarding
 * (the backend itself allows either to be null; this is presentation-level
 * completion validation only). Messages are injected via a translator so they
 * stay localized (next-intl `onboarding` namespace) and the schema stays
 * unit-testable without React.
 */

export type OnboardingFormValues = {
  target_exam_id: string;
  /** ISO `YYYY-MM-DD` from a native date input. */
  exam_date: string;
};

/** Local "today" as `YYYY-MM-DD` (matches the native date input format). */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Build a localized Zod schema. `t` is scoped to the `onboarding` namespace. */
export function buildOnboardingSchema(
  t: (key: string) => string,
  now: Date = new Date(),
) {
  const today = todayIso(now);
  return z.object({
    target_exam_id: z.string().trim().min(1, t("val_exam_required")),
    exam_date: z
      .string()
      .trim()
      .min(1, t("val_date_required"))
      // Lexicographic compare is valid for zero-padded YYYY-MM-DD dates.
      .refine((v) => v >= today, { message: t("val_date_past") }),
  });
}

export type OnboardingSchema = ReturnType<typeof buildOnboardingSchema>;
