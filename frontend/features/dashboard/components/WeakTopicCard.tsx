"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, Button } from "@/components/ui";
import { AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeakTopicCardProps {
  topicName: string;
  subjectName: string;
  accuracy: string | number;
  severity: number;
  topicId: string;
}

export default function WeakTopicCard({
  topicName,
  subjectName,
  accuracy,
  severity,
  topicId,
}: WeakTopicCardProps) {
  const t = useTranslations("dashboard");
  const router = useRouter();

  // Severity labels & styling mappings
  const getSeverityStyle = (level: number) => {
    switch (level) {
      case 2:
        return {
          bg: "bg-red-500/10 border-red-500/20",
          text: "text-red-400",
          badge: "bg-red-500/20 text-red-300",
          label: t("severity_high"),
        };
      case 1:
        return {
          bg: "bg-amber-500/10 border-amber-500/20",
          text: "text-amber-400",
          badge: "bg-amber-500/20 text-amber-300",
          label: t("severity_medium"),
        };
      default:
        return {
          bg: "bg-blue-500/10 border-blue-500/20",
          text: "text-blue-400",
          badge: "bg-blue-500/20 text-blue-300",
          label: t("severity_low"),
        };
    }
  };

  const sevStyle = getSeverityStyle(severity);

  return (
    <Card className={cn("border bg-slate-900/40 backdrop-blur-md hover:border-slate-700 transition-colors w-72 shrink-0 flex flex-col justify-between", sevStyle.bg)}>
      <CardContent className="p-5 flex flex-col h-full justify-between space-y-4">
        {/* Header Topic details */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              {subjectName}
            </span>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider", sevStyle.badge)}>
              {sevStyle.label}
            </span>
          </div>
          <h4 className="text-base font-bold text-white tracking-tight line-clamp-2">
            {topicName}
          </h4>
        </div>

        {/* Accuracy and CTA */}
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <span className="text-xs text-slate-400">{t("accuracy")}</span>
            <span className={cn("text-lg font-bold tracking-tight", sevStyle.text)}>
              {accuracy}%
            </span>
          </div>
          <Button
            onClick={() => router.push(`/practice?topic=${topicId}`)}
            size="sm"
            variant="outline"
            className="w-full flex items-center justify-center gap-1.5 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
          >
            {t("practice_now")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
