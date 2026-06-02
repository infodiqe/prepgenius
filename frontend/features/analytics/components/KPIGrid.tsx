import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Award, Clock, TrendingUp } from "lucide-react";

interface KPIGridProps {
  overallAccuracy: string | number;
  totalAttempts: number;
  avgTimeSeconds: number;
  latestAccuracy: string | number;
}

export default function KPIGrid({
  overallAccuracy,
  totalAttempts,
  avgTimeSeconds,
  latestAccuracy,
}: KPIGridProps) {
  const t = useTranslations("analytics");

  const formatAvgTime = (seconds: number) => {
    if (!seconds) return "--";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const kpis = [
    {
      title: t("overall_accuracy"),
      value: `${overallAccuracy}%`,
      description: "Aggregated syllabus success",
      icon: Target,
      colorClass: "text-green-500",
      bgClass: "bg-green-500/5 border-green-500/10",
    },
    {
      title: t("total_attempts"),
      value: totalAttempts,
      description: "Scored practices & mocks",
      icon: Award,
      colorClass: "text-indigo-500",
      bgClass: "bg-indigo-500/5 border-indigo-500/10",
    },
    {
      title: t("avg_time"),
      value: formatAvgTime(avgTimeSeconds),
      description: "Overall time per attempt",
      icon: Clock,
      colorClass: "text-blue-500",
      bgClass: "bg-blue-500/5 border-blue-500/10",
    },
    {
      title: t("trend"),
      value: `${latestAccuracy}%`,
      description: "Latest attempt accuracy",
      icon: TrendingUp,
      colorClass: "text-orange-500",
      bgClass: "bg-orange-500/5 border-orange-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, idx) => (
        <Card
          key={idx}
          className={`border ${kpi.bgClass} backdrop-blur-md hover:border-slate-700 transition-colors`}
        >
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                {kpi.title}
              </p>
              <p className="text-2xl font-bold tracking-tight text-white">
                {kpi.value}
              </p>
              <p className="text-[10px] text-slate-500">
                {kpi.description}
              </p>
            </div>
            <div className={`rounded-full bg-slate-950 p-3 ${kpi.colorClass} bg-opacity-40`}>
              <kpi.icon className="h-5 w-5" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
