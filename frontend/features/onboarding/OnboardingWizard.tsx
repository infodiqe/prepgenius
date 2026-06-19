"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, ChevronLeft } from "lucide-react";

import {
  Input,
  FormField,
  SubmitButton,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { updateProfile } from "@/features/auth/authService";
import { useAuth } from "@/features/auth/AuthContext";
import { toast } from "@/features/feedback/useToast";
import { useErrorToast } from "@/features/feedback/useErrorToast";
import { ExamPicker } from "@/features/exams/ExamPicker";
import {
  buildOnboardingSchema,
  todayIso,
  type OnboardingFormValues,
} from "@/features/onboarding/onboardingSchema";

/*
 * Onboarding wizard — Sprint 1 · T09.
 *
 * Three-step profile completion (exam → date → review) that persists via
 * PATCH /api/v1/auth/profile/. Built on the Sprint-1 frameworks: RHF + Zod
 * (T05b primitives), T01 toasts, T02 error framework, semantic tokens.
 *
 * Critical (T08 loop-prevention contract): on a successful save we toast, then
 * `await refreshProfile()` so AuthContext reflects the new target_exam_id BEFORE
 * navigating to /dashboard — otherwise the OnboardingGuard would bounce the user
 * straight back to /onboarding off a stale profile.
 */

export interface OnboardingExam {
  id: string;
  name: string;
  code: string;
}

const STEP_EXAM = 0;
const STEP_DATE = 1;
const STEP_REVIEW = 2;
const TOTAL_STEPS = 3;

export default function OnboardingWizard({
  exams,
  initialExamId = "",
  initialExamDate = "",
}: {
  exams: OnboardingExam[];
  initialExamId?: string;
  initialExamDate?: string;
}) {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const notifyError = useErrorToast();
  const { refreshProfile } = useAuth();

  const today = React.useMemo(() => todayIso(), []);
  const schema = React.useMemo(() => buildOnboardingSchema(t), [t]);

  const {
    register,
    control,
    handleSubmit,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      target_exam_id: initialExamId,
      exam_date: initialExamDate,
    },
  });

  const [step, setStep] = React.useState(STEP_EXAM);
  // CardTitle renders an <h3> but types its ref as HTMLParagraphElement.
  const headingRef = React.useRef<HTMLParagraphElement>(null);

  // Focus management: move focus to the active step's heading on each change so
  // keyboard / screen-reader users land at the top of the new step.
  React.useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const values = watch();
  const selectedExam = exams.find((e) => e.id === values.target_exam_id);
  const errorClass = "border-destructive focus-visible:ring-destructive";

  const onValidSave = async (data: OnboardingFormValues) => {
    try {
      await updateProfile({
        target_exam_id: data.target_exam_id,
        exam_date: data.exam_date,
      });
      toast({ variant: "success", title: t("success") });
      // Must complete before navigating (T08 loop-prevention contract).
      await refreshProfile();
      router.push("/dashboard");
    } catch (err) {
      notifyError(err);
    }
  };

  // Single primary action; behaviour and label depend on the active step.
  const handlePrimary = async () => {
    if (step === STEP_EXAM) {
      if (await trigger("target_exam_id")) setStep(STEP_DATE);
    } else if (step === STEP_DATE) {
      if (await trigger("exam_date")) setStep(STEP_REVIEW);
    } else {
      await handleSubmit(onValidSave)();
    }
  };

  const primaryLabel =
    step === STEP_REVIEW ? t("save") : t("next");
  const stepTitle = [t("step1_title"), t("step2_title"), t("step3_title")][step];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 py-8">
      <Card className="flex flex-1 flex-col">
        <CardHeader className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {t("step_of", { current: step + 1, total: TOTAL_STEPS })}
          </p>
          <CardTitle
            ref={headingRef}
            tabIndex={-1}
            className="outline-none"
          >
            {stepTitle}
          </CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handlePrimary();
          }}
          noValidate
          className="flex flex-1 flex-col"
        >
          <CardContent className="flex-1 space-y-6">
            {step === STEP_EXAM && (
              <Controller
                control={control}
                name="target_exam_id"
                render={({ field }) => (
                  <ExamPicker
                    id="target_exam_id"
                    exams={exams}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={isSubmitting}
                    error={errors.target_exam_id?.message}
                    required
                    label={t("exam_label")}
                    description={t("exam_help")}
                    placeholder={t("exam_placeholder")}
                  />
                )}
              />
            )}

            {step === STEP_DATE && (
              <FormField
                id="exam_date"
                label={t("date_label")}
                description={t("date_help")}
                error={errors.exam_date?.message}
                required
              >
                {(field) => (
                  <Input
                    type="date"
                    min={today}
                    disabled={isSubmitting}
                    className={cn(errors.exam_date && errorClass)}
                    {...field}
                    {...register("exam_date")}
                  />
                )}
              </FormField>
            )}

            {step === STEP_REVIEW && (
              <dl className="space-y-4" aria-label={t("review_title")}>
                <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-muted/40 p-4">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("review_exam_label")}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-foreground">
                      {selectedExam
                        ? `${selectedExam.name} (${selectedExam.code})`
                        : "—"}
                    </dd>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setStep(STEP_EXAM)}
                    className="h-auto p-0 text-xs"
                  >
                    {t("edit")}
                  </Button>
                </div>

                <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-muted/40 p-4">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("review_date_label")}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-foreground">
                      {values.exam_date || "—"}
                    </dd>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setStep(STEP_DATE)}
                    className="h-auto p-0 text-xs"
                  >
                    {t("edit")}
                  </Button>
                </div>
              </dl>
            )}
          </CardContent>

          {/* Sticky action bar — keeps the primary CTA reachable on 360px. */}
          <div className="sticky bottom-0 mt-4 flex items-center gap-3 border-t border-border bg-card/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-card/80">
            {step > STEP_EXAM ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
                disabled={isSubmitting}
                className="shrink-0"
              >
                <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
                {t("back")}
              </Button>
            ) : null}
            <SubmitButton
              isLoading={isSubmitting}
              loadingText={t("saving")}
              className="flex-1"
            >
              {step === STEP_REVIEW ? (
                <span className="flex items-center justify-center gap-2">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  {primaryLabel}
                </span>
              ) : (
                primaryLabel
              )}
            </SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
