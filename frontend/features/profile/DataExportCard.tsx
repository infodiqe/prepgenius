"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { exportData } from "@/features/auth/authService";
import { useErrorToast } from "@/features/feedback/useErrorToast";
import { toast } from "@/features/feedback/useToast";

/** T29 — wires the Data Export UI to POST /auth/data/export/ (async, 202). */
export function DataExportCard() {
  const t = useTranslations("settings");
  const notifyError = useErrorToast();
  const [loading, setLoading] = useState(false);

  const onExport = async () => {
    setLoading(true);
    try {
      await exportData();
      toast({ variant: "success", title: t("privacy.export_success") });
    } catch (err) {
      notifyError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-between gap-4 rounded-lg border border-border bg-card p-5">
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-foreground">
          {t("privacy.export_title")}
        </h4>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("privacy.export_desc")}
        </p>
      </div>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={onExport}
        disabled={loading}
      >
        {t("privacy.export_btn")}
      </Button>
    </div>
  );
}
