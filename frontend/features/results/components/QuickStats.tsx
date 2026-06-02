import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, HelpCircle, Clock } from "lucide-react";

interface QuickStatsProps {
  correct: number;
  incorrect: number;
  skipped: number;
  timeTakenSeconds: number | null;
}

export default function QuickStats({
  correct,
  incorrect,
  skipped,
  timeTakenSeconds,
}: QuickStatsProps) {
  const t = useTranslations("results");

  const formatTime = (seconds: number | null) => {
    if (seconds === null || seconds === undefined) return "--";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const statCards = [
    {
      title: t("correct"),
      value: correct,
      icon: CheckCircle2,
      colorClass: "text-green-500",
      bgClass: "bg-green-500/5 border-green-500/10",
    },
    {
      title: t("incorrect"),
      value: incorrect,
      icon: XCircle,
      colorClass: "text-red-500",
      bgClass: "bg-red-500/5 border-red-500/10",
    },
    {
      title: t("skipped"),
      value: skipped,
      icon: HelpCircle,
      colorClass: "text-slate-400",
      bgClass: "bg-slate-500/5 border-slate-500/10",
    },
    {
      title: t("time_taken"),
      value: formatTime(timeTakenSeconds),
      icon: Clock,
      colorClass: "text-blue-500",
      bgClass: "bg-blue-500/5 border-blue-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, idx) => (
        <Card
          key={idx}
          className={`border ${stat.bgClass} backdrop-blur-md hover:border-slate-700 transition-colors`}
        >
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                {stat.title}
              </p>
              <p className="text-2xl font-bold tracking-tight text-white">
                {stat.value}
              </p>
            </div>
            <div className={`rounded-full bg-slate-950 p-3 ${stat.colorClass} bg-opacity-40`}>
              <stat.icon className="h-5 w-5" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
