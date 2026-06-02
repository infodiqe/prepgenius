"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Label, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui";
import { confirmPasswordReset } from "@/features/auth/authService";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isFormValid = token.trim() !== "" && newPassword.trim() !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await confirmPasswordReset({ token, new_password: newPassword, new_password_confirm: newPassword });
      setSuccess(t("success_reset_confirm"));
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || t("error_generic"));
    } finally {
      setLoading(false);
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
            {t("reset_password_title")}
          </CardTitle>
          <CardDescription className="text-sm text-slate-400">
            {t("reset_password_subtitle")}
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

            <div className="space-y-1.5">
              <Label htmlFor="token" className="text-slate-300">
                {t("token")}
              </Label>
              <Input
                id="token"
                type="text"
                placeholder="Enter reset token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={loading}
                className="border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus-visible:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-slate-300">
                {t("new_password")}
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  className="border-slate-800 bg-slate-950 pr-10 text-white placeholder-slate-500 focus-visible:ring-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
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

            <div className="text-center text-xs text-slate-400">
              <Button
                type="button"
                variant="link"
                onClick={() => router.push("/login")}
                className="h-auto p-0 text-xs font-semibold text-blue-400 hover:text-blue-300"
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
