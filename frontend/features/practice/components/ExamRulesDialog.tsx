"use client";

import React, { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Clock, BookOpen, AlertCircle, CheckCircle, ShieldAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExamRulesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  durationSeconds: number;
  totalQuestions: number;
  isLoading?: boolean;
}

export default function ExamRulesDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  durationSeconds,
  totalQuestions,
  isLoading = false,
}: ExamRulesDialogProps) {
  const t = useTranslations("practice");
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus management
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      const focusable = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        (focusable[0] as HTMLElement).focus();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} mins`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm transition-opacity duration-300"
      aria-modal="true"
      role="dialog"
      aria-labelledby="rules-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Main dialog box (sheet bottom on mobile, center panel on desktop) */}
      <div
        ref={dialogRef}
        className={cn(
          "relative bg-slate-900 border-t border-slate-800 sm:border rounded-t-3xl sm:rounded-2xl p-6 w-full sm:max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col gap-5 text-white transition-all transform duration-300 ease-out translate-y-0 sm:scale-100",
          "animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <h2 id="rules-title" className="text-xl font-bold tracking-tight">
              {t("rules_dialog.title")}
            </h2>
            <p className="text-xs text-indigo-400 font-semibold line-clamp-1">
              {title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
            aria-label={t("rules_dialog.cancel")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3.5 bg-slate-950/40 rounded-xl border border-slate-800/80">
            <div className="rounded-lg p-2 bg-indigo-500/10 text-indigo-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                {t("rules_dialog.duration")}
              </p>
              <p className="text-sm font-bold text-slate-200">
                {formatDuration(durationSeconds)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 bg-slate-950/40 rounded-xl border border-slate-800/80">
            <div className="rounded-lg p-2 bg-indigo-500/10 text-indigo-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                {t("rules_dialog.questions")}
              </p>
              <p className="text-sm font-bold text-slate-200">
                {totalQuestions}
              </p>
            </div>
          </div>
        </div>

        {/* Details list */}
        <div className="space-y-4 text-sm text-slate-300">
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("rules_dialog.marking_scheme")}
            </h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2.5">
                <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <span>+1.0 mark for each correct response</span>
              </li>
              <li className="flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <span>-0.25 negative marking for incorrect responses</span>
              </li>
            </ul>
          </div>

          <div className="border-t border-slate-800/80 pt-4 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span>{t("rules_dialog.fullscreen")}</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t("rules_dialog.fullscreen_desc")}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 sm:pt-0 mt-2">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full sm:order-1 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 font-semibold focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
            disabled={isLoading}
          >
            {t("rules_dialog.cancel")}
          </Button>
          <Button
            onClick={onConfirm}
            className="w-full sm:order-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
            disabled={isLoading}
          >
            {isLoading ? "Starting..." : t("rules_dialog.start")}
          </Button>
        </div>
      </div>
    </div>
  );
}
