"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, BookOpen, Award, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MockTestCardProps {
  name: string;
  durationSeconds: number;
  totalQuestions: number;
  type: "system" | "previous_year" | "custom";
  difficulty?: string;
  attemptStatus: "attempted" | "in_progress" | "not_started";
  onSelect: () => void;
}

export default function MockTestCard({
  name,
  durationSeconds,
  totalQuestions,
  type,
  difficulty = "medium",
  attemptStatus,
  onSelect,
}: MockTestCardProps) {
  const t = useTranslations("practice");

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return t("duration_mins", { count: minutes });
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff.toLowerCase()) {
      case "easy":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "hard":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
  };

  const isPYP = type === "previous_year";

  return (
    <Card className="border-border bg-card backdrop-blur-md hover:border-border transition-all duration-200">
      <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {isPYP && (
              <span className="text-[9px] font-extrabold uppercase bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/25 tracking-wider">
                {t("pyp.year")}
              </span>
            )}
            {!isPYP && (
              <span className={cn("text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border tracking-wider", getDifficultyColor(difficulty))}>
                {difficulty}
              </span>
            )}
            
            {attemptStatus === "attempted" && (
              <span className="text-[9px] font-extrabold uppercase bg-green-500/15 text-green-400 px-2 py-0.5 rounded border border-green-500/25 tracking-wider">
                {t("mock_test.attempted")}
              </span>
            )}
            {attemptStatus === "in_progress" && (
              <span className="text-[9px] font-extrabold uppercase bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded border border-amber-500/25 tracking-wider">
                {t("mock_test.in_progress")}
              </span>
            )}
          </div>

          <h4 className="text-base font-bold text-foreground tracking-tight line-clamp-1">
            {name}
          </h4>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{formatDuration(durationSeconds)}</span>
            </div>
            <div className="h-3 w-px bg-muted hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{totalQuestions} {t("mock_test.questions")}</span>
            </div>
          </div>
        </div>

        <Button
          onClick={onSelect}
          variant={attemptStatus === "in_progress" ? "default" : "outline"}
          className={cn(
            "w-full sm:w-auto font-semibold flex items-center justify-center gap-1 shrink-0 px-4",
            attemptStatus === "in_progress"
              ? "bg-amber-600 hover:bg-amber-500 text-primary-foreground border-amber-600"
              : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <span>
            {attemptStatus === "in_progress" 
              ? t("pyp.resume") 
              : isPYP 
                ? t("pyp.start") 
                : t("mock_test.start")}
          </span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
