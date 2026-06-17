"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Label, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui";
import { login, getProfile } from "@/features/auth/authService";
import { Eye, EyeOff, Globe } from "lucide-react";

// Roles that should land on the Django Admin instead of the student dashboard.
const ADMIN_ROLES = ["platform_admin", "content_manager"];

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Simple validation state
  const isFormValid = email.trim() !== "" && password.trim() !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await login({ email, password });
      setSuccess(t("success_login"));

      // Decide destination from the user's roles (server-authoritative).
      // Admins go to Django Admin; everyone else to the student dashboard.
      let destination = "/dashboard";
      try {
        const profile = await getProfile();
        const roles = profile.roles ?? [];
        if (roles.some((role) => ADMIN_ROLES.includes(role))) {
          destination = "/admin/";
        }
      } catch {
        // If the profile lookup fails, fall back to the dashboard.
      }

      setTimeout(() => {
        if (destination.startsWith("/admin")) {
          // Django Admin is server-rendered (outside Next.js routing).
          window.location.href = destination;
        } else {
          router.push(destination);
          router.refresh();
        }
      }, 1000);
    } catch (err: any) {
      setError(err.message || t("error_generic"));
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (newLocale: "as" | "en" | "hi") => {
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.reload();
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-12 text-slate-100 sm:px-6 lg:px-8">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0,transparent_100%)]" />

      <Card className="relative w-full max-w-md border-slate-800 bg-slate-900/60 shadow-2xl backdrop-blur-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
            <span className="text-xl font-bold">PG</span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            {t("login_title")}
          </CardTitle>
          <CardDescription className="text-sm text-slate-400">
            {t("login_subtitle")}
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
              <Label htmlFor="email" className="text-slate-300">
                {t("email")}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus-visible:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-300">
                  {t("password")}
                </Label>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => router.push("/forgot-password")}
                  className="h-auto p-0 text-xs font-semibold text-blue-400 hover:text-blue-300"
                >
                  {t("forgot_password")}
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                t("login")
              )}
            </Button>

            <div className="flex flex-col items-center space-y-2 text-center text-xs text-slate-400">
              <div>
                {t("no_account")}{" "}
                <Button
                  type="button"
                  variant="link"
                  onClick={() => router.push("/register")}
                  className="h-auto p-0 text-xs font-semibold text-blue-400 hover:text-blue-300"
                >
                  {t("register")}
                </Button>
              </div>
              <div>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => router.push("/verify-email")}
                  className="h-auto p-0 text-xs text-slate-400 hover:text-blue-400"
                >
                  {t("verify_email_link")}
                </Button>
              </div>
            </div>
          </CardFooter>
        </form>
      </Card>

      {/* Language Switcher Footer Component */}
      <div className="mt-8 flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/40 px-4 py-1.5 backdrop-blur-md">
        <Globe className="h-4 w-4 text-slate-400" />
        <button
          onClick={() => handleLanguageChange("as")}
          className="text-xs font-semibold text-slate-300 hover:text-white"
        >
          অসমীয়া
        </button>
        <span className="text-slate-700">|</span>
        <button
          onClick={() => handleLanguageChange("en")}
          className="text-xs font-semibold text-slate-300 hover:text-white"
        >
          English
        </button>
        <span className="text-slate-700">|</span>
        <button
          onClick={() => handleLanguageChange("hi")}
          className="text-xs font-semibold text-slate-300 hover:text-white"
        >
          हिंदी
        </button>
      </div>
    </div>
  );
}
