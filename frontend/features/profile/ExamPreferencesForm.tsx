"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { Calendar, Target } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  SubmitButton,
} from "@/components/ui";
import {
  updateProfile,
  type UserProfile,
} from "@/features/auth/authService";
import { useAuth } from "@/features/auth/AuthContext";
import { ExamDatePicker } from "@/features/exams/ExamDatePicker";
import {
  ExamPicker,
  type ExamPickerOption,
} from "@/features/exams/ExamPicker";
import { useErrorToast } from "@/features/feedback/useErrorToast";
import { toast } from "@/features/feedback/useToast";
import { todayIso } from "@/features/onboarding/onboardingSchema";
import {
  buildExamPreferencesSchema,
  type ExamPreferencesValues,
} from "./profileSchemas";

export function ExamPreferencesForm({
  user,
  exams,
}: {
  user: UserProfile;
  exams: ExamPickerOption[];
}) {
  const t = useTranslations("settings");
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const notifyError = useErrorToast();
  const today = React.useMemo(() => todayIso(), []);
  const schema = React.useMemo(() => buildExamPreferencesSchema(t), [t]);

  const {
    control,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ExamPreferencesValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      target_exam_id: user.target_exam_id ?? "",
      exam_date: user.exam_date ?? "",
    },
  });

  const selectedExamId = watch("target_exam_id");
  const selectedExam = exams.find((exam) => exam.id === selectedExamId);

  const onSubmit = async (values: ExamPreferencesValues) => {
    try {
      await updateProfile({
        target_exam_id: values.target_exam_id,
        exam_date: values.exam_date || null,
      });
      await refreshProfile();
      toast({ variant: "success", title: t("exam.success") });
      router.refresh();
    } catch (error) {
      const appError = notifyError(error);
      const examMessages = appError.fieldErrors?.target_exam_id;
      const dateMessages = appError.fieldErrors?.exam_date;
      if (examMessages?.length) {
        setError("target_exam_id", {
          type: "server",
          message: examMessages.join(" "),
        });
      }
      if (dateMessages?.length) {
        setError("exam_date", {
          type: "server",
          message: dateMessages.join(" "),
        });
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" aria-hidden="true" />
          {t("exam.title")}
        </CardTitle>
        <CardDescription>{t("exam.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {selectedExam ? (
          <div
            className="flex flex-col gap-3 rounded-md border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between"
            aria-live="polite"
          >
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {t("exam.current")}
              </p>
              <p className="mt-1 font-semibold text-foreground">
                {selectedExam.name} ({selectedExam.code})
              </p>
            </div>
            {user.exam_date ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                {user.exam_date}
              </p>
            ) : null}
          </div>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Controller
              control={control}
              name="target_exam_id"
              render={({ field }) => (
                <ExamPicker
                  id="profile-target-exam"
                  exams={exams}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={isSubmitting}
                  error={errors.target_exam_id?.message}
                  required
                  label={t("exam.select_exam")}
                  description={t("exam.exam_help")}
                  placeholder={t("exam.exam_placeholder")}
                  emptyTitle={t("exam.empty_title")}
                  emptyDescription={t("exam.empty_desc")}
                />
              )}
            />

            <Controller
              control={control}
              name="exam_date"
              render={({ field }) => (
                <ExamDatePicker
                  id="profile-exam-date"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={isSubmitting}
                  error={errors.exam_date?.message}
                  minDate={today}
                  label={t("exam.date")}
                  description={t("exam.date_help")}
                />
              )}
            />
          </div>

          {exams.length > 0 ? (
            <SubmitButton
              isLoading={isSubmitting}
              loadingText={t("exam.saving")}
              disabled={!isDirty}
              className="md:w-auto"
            >
              {t("exam.save")}
            </SubmitButton>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

