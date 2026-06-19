"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useToast, type ToastVariant } from "./useToast";

const DEFAULT_DURATION = 5000;

const VARIANT_ICON: Record<ToastVariant, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
};

const VARIANT_ICON_COLOR: Record<ToastVariant, string> = {
  info: "text-primary",
  success: "text-success",
  error: "text-destructive",
  warning: "text-warning",
};

/**
 * Global Toaster — Sprint 1 · T01. Mounted once in the root layout; renders the
 * toast store. Error/warning are announced assertively, info/success politely
 * (Radix `type`). Localized close label via the `toast` i18n namespace.
 */
export function Toaster() {
  const { toasts, dismiss } = useToast();
  const t = useTranslations("toast");

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, variant, duration, open }) => {
        const Icon = VARIANT_ICON[variant];
        const assertive = variant === "error" || variant === "warning";
        return (
          <Toast
            key={id}
            variant={variant}
            open={open}
            duration={duration ?? DEFAULT_DURATION}
            type={assertive ? "foreground" : "background"}
            onOpenChange={(isOpen) => {
              if (!isOpen) dismiss(id);
            }}
          >
            <Icon
              className={cn(
                "mt-0.5 h-5 w-5 shrink-0",
                VARIANT_ICON_COLOR[variant],
              )}
              aria-hidden="true"
            />
            <div className="flex-1 space-y-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            <ToastClose aria-label={t("close")} />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
