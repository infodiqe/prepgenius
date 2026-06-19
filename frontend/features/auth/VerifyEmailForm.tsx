"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

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
  CardFooter,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  verifyEmail,
  resendVerification,
} from "@/features/auth/authService";
import { toast } from "@/features/feedback/useToast";
import { useErrorToast } from "@/features/feedback/useErrorToast";
import {
  buildVerifyEmailSchema,
  type VerifyEmailFormValues,
} from "@/features/auth/verifyEmailSchema";

/*
 * Verify-email form — Sprint 1 · T07.
 *
 * Upgrades the email-verification flow onto the Sprint-1 frameworks: T01 toasts
 * (success/feedback), T02 error framework (classified, localized error toasts +
 * inline field mapping), the T05b shared form primitives (FormField /
 * SubmitButton), and semantic theme tokens (light/dark aware). Token
 * verification and resend behaviour are preserved; the API contracts
 * (verify-email, resend-verification) are unchanged.
 */
export default function VerifyEmailForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const notifyError = useErrorToast();

  // Email is normally carried over from the registration redirect; when it is
  // present we hide the field but keep the value for resend.
  const emailParam = searchParams.get("email")?.trim() ?? "";
  const hasEmailParam = emailParam !== "";

  const schema = React.useMemo(() => buildVerifyEmailSchema(t), [t]);

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VerifyEmailFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { token: "", email: emailParam },
  });

  const [isResending, setIsResending] = React.useState(false);

  const onSubmit = async (values: VerifyEmailFormValues) => {
    try {
      await verifyEmail({ token: values.token.trim() });
      toast({ variant: "success", title: t("success_verify") });
      router.push("/login");
    } catch (err) {
      const appError = notifyError(err);
      // Surface a backend token error inline when provided.
      const tokenErrors = appError.fieldErrors?.token;
      if (tokenErrors?.length) {
        setError("token", { type: "server", message: tokenErrors.join(" ") });
      }
    }
  };

  const onResend = async () => {
    const email = getValues("email").trim();
    if (!email) {
      setError("email", { type: "manual", message: t("val_email_required") });
      return;
    }
    // Validate format (no-op for the hidden, prefilled-from-redirect case).
    if (!(await trigger("email"))) return;

    setIsResending(true);
    try {
      await resendVerification({ email });
      toast({ variant: "success", title: t("success_resend") });
    } catch (err) {
      notifyError(err);
    } finally {
      setIsResending(false);
    }
  };

  const errorClass = "border-destructive focus-visible:ring-destructive";
  const busy = isSubmitting || isResending;

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <span className="text-xl font-bold">PG</span>
        </div>
        <CardTitle>{t("verify_email_title")}</CardTitle>
        <CardDescription>{t("verify_email_subtitle")}</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          {!hasEmailParam && (
            <FormField
              id="email"
              label={t("email")}
              description={t("email_for_resend")}
              error={errors.email?.message}
            >
              {(field) => (
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  disabled={busy}
                  className={cn(errors.email && errorClass)}
                  {...field}
                  {...register("email")}
                />
              )}
            </FormField>
          )}

          <FormField id="token" label={t("verify_token")} error={errors.token?.message}>
            {(field) => (
              <Input
                type="text"
                inputMode="text"
                autoComplete="one-time-code"
                placeholder={t("verify_token_placeholder")}
                disabled={busy}
                className={cn(errors.token && errorClass)}
                {...field}
                {...register("token")}
              />
            )}
          </FormField>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <SubmitButton isLoading={isSubmitting} loadingText={t("verifying")} disabled={busy}>
            {t("submit")}
          </SubmitButton>

          <div className="flex flex-col items-center space-y-2 text-center text-xs text-muted-foreground">
            <Button
              type="button"
              variant="link"
              onClick={onResend}
              disabled={busy}
              aria-busy={isResending || undefined}
              className="h-auto p-0 text-xs font-semibold"
            >
              {isResending ? t("resending") : t("resend_verification")}
            </Button>
            <Button
              type="button"
              variant="link"
              onClick={() => router.push("/login")}
              disabled={busy}
              className="h-auto p-0 text-xs"
            >
              {t("back_to_login")}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
