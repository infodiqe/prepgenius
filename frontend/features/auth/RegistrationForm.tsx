"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";

import {
  Button,
  Input,
  Label,
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
 * Registration Form Foundation — Sprint 1 · T05a.
 *
 * React Hook Form + Zod validation, T01 toasts for success/global errors, T02
 * error framework (useErrorToast → AppError.fieldErrors) for inline field
 * errors. Token-driven (light/dark), mobile-first (360px), accessible (labels,
 * aria-invalid, aria-describedby, keyboard). Posts to the existing
 * /api/v1/auth/register/ contract and follows the existing verify-email flow.
 * Consent is NOT collected here — that is T06.
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

  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

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

  /** Shared className for inputs/select so error styling stays consistent. */
  const fieldError = "border-destructive focus-visible:ring-destructive";

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
          {/* Full name */}
          <div className="space-y-1.5">
            <Label htmlFor="full_name">{t("name")}</Label>
            <Input
              id="full_name"
              type="text"
              autoComplete="name"
              disabled={isSubmitting}
              aria-invalid={!!errors.full_name}
              aria-describedby={errors.full_name ? "full_name-error" : undefined}
              className={cn(errors.full_name && fieldError)}
              {...register("full_name")}
            />
            {errors.full_name && (
              <p
                id="full_name-error"
                role="alert"
                className="text-sm font-medium text-destructive"
              >
                {errors.full_name.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              disabled={isSubmitting}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={cn(errors.email && fieldError)}
              {...register("email")}
            />
            {errors.email && (
              <p
                id="email-error"
                role="alert"
                className="text-sm font-medium text-destructive"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Phone (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="phone_e164">
              {t("phone")}{" "}
              <span className="text-muted-foreground">
                ({t("phone_optional_hint")})
              </span>
            </Label>
            <Input
              id="phone_e164"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+919812345678"
              disabled={isSubmitting}
              aria-invalid={!!errors.phone_e164}
              aria-describedby={errors.phone_e164 ? "phone_e164-error" : undefined}
              className={cn(errors.phone_e164 && fieldError)}
              {...register("phone_e164")}
            />
            {errors.phone_e164 && (
              <p
                id="phone_e164-error"
                role="alert"
                className="text-sm font-medium text-destructive"
              >
                {errors.phone_e164.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("password")}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                disabled={isSubmitting}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
                className={cn("pr-10", errors.password && fieldError)}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                aria-label={showPassword ? t("hide_password") : t("show_password")}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.password && (
              <p
                id="password-error"
                role="alert"
                className="text-sm font-medium text-destructive"
              >
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label htmlFor="password_confirm">{t("confirm_password")}</Label>
            <div className="relative">
              <Input
                id="password_confirm"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                disabled={isSubmitting}
                aria-invalid={!!errors.password_confirm}
                aria-describedby={
                  errors.password_confirm ? "password_confirm-error" : undefined
                }
                className={cn("pr-10", errors.password_confirm && fieldError)}
                {...register("password_confirm")}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                aria-label={showConfirm ? t("hide_password") : t("show_password")}
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.password_confirm && (
              <p
                id="password_confirm-error"
                role="alert"
                className="text-sm font-medium text-destructive"
              >
                {errors.password_confirm.message}
              </p>
            )}
          </div>

          {/* Preferred language */}
          <div className="space-y-1.5">
            <Label htmlFor="preferred_language">{t("preferred_language")}</Label>
            <select
              id="preferred_language"
              disabled={isSubmitting}
              aria-invalid={!!errors.preferred_language}
              aria-describedby={
                errors.preferred_language
                  ? "preferred_language-error"
                  : undefined
              }
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                errors.preferred_language && fieldError,
              )}
              {...register("preferred_language")}
            >
              {PREFERRED_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang]}
                </option>
              ))}
            </select>
            {errors.preferred_language && (
              <p
                id="preferred_language-error"
                role="alert"
                className="text-sm font-medium text-destructive"
              >
                {errors.preferred_language.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
                  aria-hidden="true"
                />
                {t("creating_account")}
              </span>
            ) : (
              t("register")
            )}
          </Button>

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
