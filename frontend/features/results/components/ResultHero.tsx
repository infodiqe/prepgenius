import React from "react";
import { useTranslations } from "next-intl";
import { Award, AlertTriangle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResultHeroProps {
  passStatus: string;
  score: string | number;
  maxScore: string | number;
  accuracy: string | number;
}

export default function ResultHero({
  passStatus,
  score,
  maxScore,
  accuracy,
}: ResultHeroProps) {
  const t = useTranslations("results");
  const isPassed = passStatus === "pass";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-8 shadow-2xl backdrop-blur-xl transition-all duration-300",
        isPassed
          ? "border-green-500/20 bg-green-500/10"
          : "border-red-500/20 bg-red-500/10"
      )}
      role="region"
      aria-label={t("title")}
    >
      {/* Background decorations */}
      <div
        className={cn(
          "absolute right-0 top-0 -mr-6 -mt-6 h-36 w-36 rounded-full blur-3xl opacity-20",
          isPassed ? "bg-green-500" : "bg-red-500"
        )}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "rounded-full p-4",
              isPassed ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
            )}
          >
            {isPassed ? (
              <ShieldCheck className="h-10 w-10 animate-bounce" />
            ) : (
              <AlertTriangle className="h-10 w-10 animate-pulse" />
            )}
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              {isPassed ? t("pass") : t("needs_work")}
            </h1>
            <p className="text-sm text-muted-foreground max-w-md">
              {isPassed ? t("pass_desc") : t("needs_work_desc")}
            </p>
          </div>
        </div>

        <div className="flex items-baseline gap-6 border-t md:border-t-0 border-border pt-6 md:pt-0">
          <div className="space-y-1">
            <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
              {t("score")}
            </span>
            <div className="text-4xl font-extrabold text-foreground">
              {score}
              <span className="text-lg font-normal text-muted-foreground"> / {maxScore}</span>
            </div>
          </div>

          <div className="h-10 w-px bg-muted" />

          <div className="space-y-1">
            <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
              {t("accuracy")}
            </span>
            <div
              className={cn(
                "text-4xl font-extrabold",
                isPassed ? "text-green-400" : "text-red-400"
              )}
            >
              {accuracy}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
