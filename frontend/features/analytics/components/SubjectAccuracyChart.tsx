import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubjectData {
  name: string;
  accuracy: number;
}

interface SubjectAccuracyChartProps {
  data: SubjectData[];
}

export default function SubjectAccuracyChart({
  data,
}: SubjectAccuracyChartProps) {
  const t = useTranslations("analytics");

  return (
    <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-400" />
          {t("subject_performance")}
        </CardTitle>
        <CardDescription className="text-xs text-slate-400">
          Accuracy percentage across subject domains.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-3">
        {data.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            No subject data available.
          </p>
        ) : (
          data.map((item, idx) => {
            const accuracy = item.accuracy;

            return (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300">{item.name}</span>
                  <span className="text-white">{accuracy}%</span>
                </div>

                <div className="relative h-4 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                  {/* Decorative grid marker lines (25%, 50%, 75%) */}
                  <div className="absolute left-[25%] top-0 bottom-0 w-px bg-slate-800/40" />
                  <div className="absolute left-[50%] top-0 bottom-0 w-px bg-slate-800/40" />
                  <div className="absolute left-[75%] top-0 bottom-0 w-px bg-slate-800/40" />

                  {/* SVG Gradient filled bar */}
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700 ease-out",
                      accuracy >= 60
                        ? "bg-gradient-to-r from-green-600/80 to-green-400"
                        : accuracy >= 40
                        ? "bg-gradient-to-r from-amber-600/80 to-amber-400"
                        : "bg-gradient-to-r from-red-600/80 to-red-400"
                    )}
                    style={{ width: `${accuracy}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
