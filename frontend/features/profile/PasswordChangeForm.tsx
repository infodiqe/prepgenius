"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Shield } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
} from "@/components/ui";
import { PasswordInput } from "@/components/ui/password-input";
import { changePassword } from "@/features/auth/authService";
import { useErrorToast } from "@/features/feedback/useErrorToast";
import { toast } from "@/features/feedback/useToast";

/** T29 — wires the Password Change UI to POST /auth/password/change/. */
export function PasswordChangeForm() {
  const t = useTranslations("settings");
  const notifyError = useErrorToast();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit =
    current.length > 0 && next.length >= 8 && next === confirm && !loading;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      await changePassword({
        current_password: current,
        new_password: next,
        new_password_confirm: confirm,
      });
      toast({ variant: "success", title: t("security.success") });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      notifyError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
          {t("security.title")}
        </CardTitle>
        <CardDescription>{t("security.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="max-w-md space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="current-password">
              {t("security.current_password")}
            </Label>
            <PasswordInput
              id="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              showAriaLabel={t("security.show_password")}
              hideAriaLabel={t("security.hide_password")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-password">{t("security.new_password")}</Label>
            <PasswordInput
              id="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
              showAriaLabel={t("security.show_password")}
              hideAriaLabel={t("security.hide_password")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">
              {t("security.confirm_password")}
            </Label>
            <PasswordInput
              id="confirm-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
              aria-invalid={mismatch}
              aria-describedby={mismatch ? "password-mismatch" : undefined}
              showAriaLabel={t("security.show_password")}
              hideAriaLabel={t("security.hide_password")}
            />
            {mismatch && (
              <p
                id="password-mismatch"
                role="alert"
                className="text-sm text-destructive"
              >
                {t("security.mismatch")}
              </p>
            )}
          </div>

          <Button type="submit" disabled={!canSubmit} className="w-full md:w-auto">
            {t("security.submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
