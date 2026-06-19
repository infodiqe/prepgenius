"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";

import {
  Input,
  PasswordInput,
  Checkbox,
  Label,
  FormField,
  FieldError,
  SubmitButton,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { register as registerUser } from "@/features/auth/authService";
import { toast } from "@/features/feedback/useToast";
import { useErrorToast } from "@/features/feedback/useErrorToast";
import {
  buildRegistrationSchema,
  PREFERRED_LANGUAGES,
  type PreferredLanguage,
  type RegistrationFormValues,
} from "@/features/auth/registrationSchema";

/*
 * Registration form — Sprint 1 · T05a, refactored onto the shared form
 * primitives in T05b. Validation (RHF + Zod), T01 toasts, T02 error framework,
 * and the existing /api/v1/auth/register/ flow are unchanged; the field markup
 * comes from FormField / PasswordInput / SubmitButton.
 *
 * T06 adds a required DPDP consent acknowledgement: the checkbox gates submit
 * (validated client-side via the schema) but is deliberately excluded from the
 * request payload — the backend creates UserConsent automatically and never
 * accepts a consent field. No API/auth contract change.
 */

// Native option labels are endonyms (identical across locales) → not translated.
const LANGUAGE_LABELS: Record<PreferredLanguage, string> = {
  as: "অসমীয়া",
  en: "English",
  hi: "हिन्दी",
};

const FORM_FIELDS: ReadonlyArray<keyof RegistrationFormValues> = [
  "full_name",
  "email",
  "phone_e164",
  "password",
  "password_confirm",
  "preferred_language",
];

/** Read the current locale from the cookie so the default language matches. */
function initialLanguage(): PreferredLanguage {
  if (typeof document === "undefined") return "as";
  const match = document.cookie.match(/locale=(as|en|hi)/);
  return (match ? match[1] : "as") as PreferredLanguage;
}

export default function RegistrationForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const notifyError = useErrorToast();

  // Rebuild the resolver when the locale (translator) changes so messages stay
  // localized. `t` from next-intl is stable per render of the active locale.
  const schema = React.useMemo(() => buildRegistrationSchema(t), [t]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      email: "",
      phone_e164: "",
      password: "",
      password_confirm: "",
      preferred_language: initialLanguage(),
      consent: false,
    },
  });

  const onSubmit = async (values: RegistrationFormValues) => {
    try {
      const phone = values.phone_e164?.trim();
      await registerUser({
        full_name: values.full_name,
        email: values.email,
        password: values.password,
        password_confirm: values.password_confirm,
        preferred_language: values.preferred_language,
        ...(phone ? { phone_e164: phone } : {}),
      });

      toast({ variant: "success", title: t("success_register") });
      router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
    } catch (err) {
      // Global toast + normalized error; map any backend field errors inline.
      const appError = notifyError(err);
      if (appError.fieldErrors) {
        for (const field of FORM_FIELDS) {
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
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <span className="text-xl font-bold">PG</span>
        </div>
        <CardTitle>{t("register_title")}</CardTitle>
        <CardDescription>{t("register_subtitle")}</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          <FormField id="full_name" label={t("name")} error={errors.full_name?.message}>
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

          <FormField id="email" label={t("email")} error={errors.email?.message}>
            {(field) => (
              <Input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                disabled={isSubmitting}
                className={cn(errors.email && errorClass)}
                {...field}
                {...register("email")}
              />
            )}
          </FormField>

          <FormField
            id="phone_e164"
            label={t("phone")}
            description={t("phone_optional_hint")}
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

          <FormField id="password" label={t("password")} error={errors.password?.message}>
            {(field) => (
              <PasswordInput
                autoComplete="new-password"
                disabled={isSubmitting}
                showAriaLabel={t("show_password")}
                hideAriaLabel={t("hide_password")}
                className={cn(errors.password && errorClass)}
                {...field}
                {...register("password")}
              />
            )}
          </FormField>

          <FormField
            id="password_confirm"
            label={t("confirm_password")}
            error={errors.password_confirm?.message}
          >
            {(field) => (
              <PasswordInput
                autoComplete="new-password"
                disabled={isSubmitting}
                showAriaLabel={t("show_password")}
                hideAriaLabel={t("hide_password")}
                className={cn(errors.password_confirm && errorClass)}
                {...field}
                {...register("password_confirm")}
              />
            )}
          </FormField>

          <FormField
            id="preferred_language"
            label={t("preferred_language")}
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
                {PREFERRED_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {LANGUAGE_LABELS[lang]}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          {/*
           * DPDP consent (T06). Client-only gate: required to submit, never sent
           * to the API. Links open the policy pages in a new tab; their click is
           * isolated so following a link does not toggle the wrapping label.
           */}
          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <Checkbox
                id="consent"
                disabled={isSubmitting}
                aria-required
                aria-invalid={errors.consent ? true : undefined}
                aria-describedby={errors.consent ? "consent-error" : undefined}
                className={cn("mt-0.5", errors.consent && errorClass)}
                {...register("consent")}
              />
              <Label
                htmlFor="consent"
                className="text-sm font-normal leading-snug text-muted-foreground"
              >
                {t.rich("consent_acknowledgement", {
                  privacy: (chunks) => (
                    <Link
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-primary underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {chunks}
                    </Link>
                  ),
                  terms: (chunks) => (
                    <Link
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-primary underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {chunks}
                    </Link>
                  ),
                })}
              </Label>
            </div>
            <FieldError id="consent-error">{errors.consent?.message}</FieldError>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <SubmitButton isLoading={isSubmitting} loadingText={t("creating_account")}>
            {t("register")}
          </SubmitButton>

          <div className="text-center text-xs text-muted-foreground">
            {t("have_account")}{" "}
            <Button
              type="button"
              variant="link"
              onClick={() => router.push("/login")}
              className="h-auto p-0 text-xs font-semibold"
            >
              {t("login")}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
