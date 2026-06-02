"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Label, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui";
import { verifyEmail } from "@/features/auth/authService";
import { apiRequest } from "@/lib/api/client";

export default function VerifyEmailPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const isFormValid = token.trim() !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await verifyEmail({ token });
      setSuccess(t("success_verify"));
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || t("error_generic"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError("Please provide your email to resend the code.");
      return;
    }

    setResending(true);
    setError(null);
    setSuccess(null);

    try {
      await apiRequest("/auth/resend-verification/", {
        method: "POST",
        body: { email },
      });
      setSuccess("Verification email resent successfully. Please check your inbox.");
    } catch (err: any) {
      setError(err.message || t("error_generic"));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-12 text-slate-100 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0,transparent_100%)]" />

      <Card className="relative w-full max-w-md border-slate-800 bg-slate-900/60 shadow-2xl backdrop-blur-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
            <span className="text-xl font-bold">PG</span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            {t("verify_email_title")}
          </CardTitle>
          <CardDescription className="text-sm text-slate-400">
            {t("verify_email_subtitle")}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-500/10 p-3 text-sm font-medium text-red-400 border border-red-500/20">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-green-500/10 p-3 text-sm font-medium text-green-400 border border-green-500/20">
                {success}
              </div>
            )}

            {!email && (
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-300">
                  {t("email")} (needed for resending token)
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus-visible:ring-blue-500"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="token" className="text-slate-300">
                {t("verify_token")}
              </Label>
              <Input
                id="token"
                type="text"
                placeholder="Enter token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={loading}
                className="border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus-visible:ring-blue-500"
                required
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              disabled={loading || !isFormValid}
              className="w-full bg-blue-600 font-semibold text-white hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-white" />
              ) : (
                t("submit")
              )}
            </Button>

            <div className="flex flex-col items-center space-y-2 text-center text-xs text-slate-400">
              {email && (
                <Button
                  type="button"
                  variant="link"
                  onClick={handleResend}
                  disabled={resending}
                  className="h-auto p-0 text-xs font-semibold text-blue-400 hover:text-blue-300"
                >
                  {resending ? "Resending..." : t("resend_verification")}
                </Button>
              )}
              <Button
                type="button"
                variant="link"
                onClick={() => router.push("/login")}
                className="h-auto p-0 text-xs text-slate-400 hover:text-blue-400"
              >
                {t("back_to_login")}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
