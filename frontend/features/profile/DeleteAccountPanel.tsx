"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { ShieldAlert } from "lucide-react";
import { Button, Label } from "@/components/ui";
import { PasswordInput } from "@/components/ui/password-input";
import { deleteAccount } from "@/features/auth/authService";
import { useErrorToast } from "@/features/feedback/useErrorToast";

/**
 * T29 — wires the Account Delete UI to DELETE /auth/account/delete/.
 *
 * Two-step confirmation: the user must re-enter their password (the backend's
 * safeguard) before deletion. On success the backend clears the auth cookies,
 * so we hard-redirect to /login to clear all client state.
 */
export function DeleteAccountPanel() {
  const t = useTranslations("settings");
  const notifyError = useErrorToast();

  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onDelete = async () => {
    if (!password) return;
    setLoading(true);
    try {
      await deleteAccount({ password });
      window.location.href = "/login";
    } catch (err) {
      notifyError(err);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-5">
      <div className="space-y-1">
        <h4 className="flex items-center gap-1.5 text-sm font-bold text-destructive">
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          {t("privacy.delete_title")}
        </h4>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("privacy.delete_desc")}
        </p>
      </div>

      {!confirming ? (
        <Button
          type="button"
          variant="destructive"
          className="w-full"
          onClick={() => setConfirming(true)}
        >
          {t("privacy.delete_btn")}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="delete-password">
              {t("privacy.delete_password_label")}
            </Label>
            <PasswordInput
              id="delete-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              showAriaLabel={t("security.show_password")}
              hideAriaLabel={t("security.hide_password")}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              disabled={loading}
              onClick={() => {
                setConfirming(false);
                setPassword("");
              }}
            >
              {t("privacy.delete_cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              disabled={!password || loading}
              onClick={onDelete}
            >
              {t("privacy.delete_confirm_btn")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
