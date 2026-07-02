import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Award, Clock, TrendingUp } from "lucide-react";

interface KPIGridProps {
  overallAccuracy: string | number | null;
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
      // null = no answered-question data → "—" rather than a fabricated value.
      value: overallAccuracy === null ? "—" : `${overallAccuracy}%`,
      description: t("kpi_accuracy_desc"),
      icon: Target,
      colorClass: "text-green-500",
      bgClass: "bg-green-500/5 border-green-500/10",
    },
    {
      title: t("total_attempts"),
      value: totalAttempts,
      description: t("kpi_attempts_desc"),
      icon: Award,
      colorClass: "text-indigo-500",
      bgClass: "bg-indigo-500/5 border-indigo-500/10",
    },
    {
      title: t("avg_time"),
      value: formatAvgTime(avgTimeSeconds),
      description: t("kpi_time_desc"),
      icon: Clock,
      colorClass: "text-blue-500",
      bgClass: "bg-blue-500/5 border-blue-500/10",
    },
    {
      title: t("trend"),
      value: `${latestAccuracy}%`,
      description: t("kpi_trend_desc"),
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
          className={`border ${kpi.bgClass} backdrop-blur-md hover:border-border transition-colors`}
        >
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {kpi.title}
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {kpi.value}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {kpi.description}
              </p>
            </div>
            <div className={`rounded-full bg-muted p-3 ${kpi.colorClass} bg-opacity-40`}>
              <kpi.icon className="h-5 w-5" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
