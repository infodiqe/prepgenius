"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { User } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  SubmitButton,
} from "@/components/ui";
import {
  updateProfile,
  type UserProfile,
} from "@/features/auth/authService";
import { useAuth } from "@/features/auth/AuthContext";
import { useErrorToast } from "@/features/feedback/useErrorToast";
import { toast } from "@/features/feedback/useToast";
import { cn } from "@/lib/utils";
import {
  buildProfileDetailsSchema,
  PROFILE_LANGUAGES,
  type ProfileDetailsValues,
  type ProfileLanguage,
} from "./profileSchemas";

const LANGUAGE_LABELS: Record<ProfileLanguage, string> = {
  as: "অসমীয়া",
  en: "English",
  hi: "हिन्दी",
};

const PROFILE_FIELDS: ReadonlyArray<keyof ProfileDetailsValues> = [
  "full_name",
  "phone_e164",
  "preferred_language",
];

function supportedLanguage(value: string | undefined): ProfileLanguage {
  return PROFILE_LANGUAGES.includes(value as ProfileLanguage)
    ? (value as ProfileLanguage)
    : "as";
}

export function ProfileDetailsForm({ user }: { user: UserProfile }) {
  const t = useTranslations("settings");
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const notifyError = useErrorToast();
  const schema = React.useMemo(() => buildProfileDetailsSchema(t), [t]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileDetailsValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: user.full_name,
      phone_e164: user.phone_e164 ?? "",
      preferred_language: supportedLanguage(user.preferred_language),
    },
  });

  const onSubmit = async (values: ProfileDetailsValues) => {
    try {
      await updateProfile({
        full_name: values.full_name.trim(),
        phone_e164: values.phone_e164.trim(),
        preferred_language: values.preferred_language,
      });
      document.cookie = `locale=${values.preferred_language}; path=/; max-age=31536000; SameSite=Lax`;
      await refreshProfile();
      toast({ variant: "success", title: t("profile.success") });
      router.refresh();
    } catch (error) {
      const appError = notifyError(error);
      if (appError.fieldErrors) {
        for (const field of PROFILE_FIELDS) {
          const messages = appError.fieldErrors[field];
          if (messages?.length) {
            setError(field, { type: "server", message: messages.join(" ") });
          }
        }
      }
    }
  };

  const errorClass = "border-destructive focus-visible:ring-destructive";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" aria-hidden="true" />
          {t("profile.title")}
        </CardTitle>
        <CardDescription>{t("profile.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-5 md:grid-cols-2"
          noValidate
        >
          <FormField
            id="profile-full-name"
            label={t("profile.full_name")}
            error={errors.full_name?.message}
            required
          >
            {(field) => (
              <Input
                type="text"
                autoComplete="name"
                disabled={isSubmitting}
                className={cn(errors.full_name && errorClass)}
                {...field}
                {...register("full_name")}
              />
            )}
          </FormField>

          <FormField id="profile-email" label={t("profile.email")}>
            {(field) => (
              <Input
                type="email"
                value={user.email}
                readOnly
                aria-readonly="true"
                className="bg-muted text-muted-foreground"
                {...field}
              />
            )}
          </FormField>

          <FormField
            id="profile-phone"
            label={t("profile.phone")}
            description={t("profile.phone_help")}
            error={errors.phone_e164?.message}
          >
            {(field) => (
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+919812345678"
                disabled={isSubmitting}
                className={cn(errors.phone_e164 && errorClass)}
                {...field}
                {...register("phone_e164")}
              />
            )}
          </FormField>

          <FormField
            id="profile-language"
            label={t("profile.language")}
            error={errors.preferred_language?.message}
          >
            {(field) => (
              <select
                disabled={isSubmitting}
                className={cn(
                  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                  errors.preferred_language && errorClass,
                )}
                {...field}
                {...register("preferred_language")}
              >
                {PROFILE_LANGUAGES.map((language) => (
                  <option key={language} value={language}>
                    {LANGUAGE_LABELS[language]}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          <div className="md:col-span-2">
            <SubmitButton
              isLoading={isSubmitting}
              loadingText={t("profile.saving")}
              disabled={!isDirty}
              className="md:w-auto"
            >
              {t("profile.save")}
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

