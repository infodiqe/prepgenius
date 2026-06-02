import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubjectBreakdownItem {
  id: string;
  scope_id: string;
  name: string;
  total: number;
  correct: number;
  accuracy: string | null; // decimal string
  avg_time: string | null; // decimal string
}

interface SectionBreakdownProps {
  subjects: SubjectBreakdownItem[];
  passingCriteria: any;
}

export default function SectionBreakdown({
  subjects,
  passingCriteria,
}: SectionBreakdownProps) {
  const t = useTranslations("results");

  // Get the required percentage dynamically from backend exam settings
  const passPercentage = passingCriteria?.general?.required_percentage
    ? Number(passingCriteria.general.required_percentage)
    : null;

  return (
    <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
          {t("section_pass_line")}
        </CardTitle>
        <CardDescription className="text-xs text-slate-400">
          {passPercentage !== null
            ? `Compare your subject scores against the required exam target of ${passPercentage}%.`
            : "Compare your subject scores in this attempt."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {subjects.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            No subject breakdowns available for this attempt.
          </p>
        ) : (
          subjects.map((subj) => {
            const accuracyVal = Number(subj.accuracy || 0);
            const isSubjPassed = passPercentage !== null ? accuracyVal >= passPercentage : true;

            return (
              <div key={subj.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{subj.name}</span>
                    <span className="text-xs text-slate-400">
                      ({subj.correct}/{subj.total})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        passPercentage !== null
                          ? isSubjPassed
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                          : "bg-slate-500/10 text-slate-400"
                      )}
                    >
                      {accuracyVal}%
                    </span>
                    {passPercentage !== null && (
                      <span className="text-slate-500 text-xs">/ Target: {passPercentage}%</span>
                    )}
                  </div>
                </div>

                {/* Progress bar with passing threshold line */}
                <div className="relative h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  {/* Subject Accuracy bar */}
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      passPercentage !== null
                        ? isSubjPassed
                          ? "bg-gradient-to-r from-green-600 to-green-400"
                          : "bg-gradient-to-r from-red-600 to-red-400"
                        : "bg-gradient-to-r from-slate-600 to-slate-400"
                    )}
                    style={{ width: `${accuracyVal}%` }}
                  />

                  {/* Pass line indicator marker */}
                  {passPercentage !== null && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-yellow-500/80 shadow-[0_0_4px_rgba(234,179,8,0.6)]"
                      style={{ left: `${passPercentage}%` }}
                      title={`Required Pass Line: ${passPercentage}%`}
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
