"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle, Clock, Calendar } from "lucide-react";

interface AttemptItem {
  id: string;
  attempt_type: string;
  mock_test_id: string | null;
  started_at: string | null;
  duration_seconds: number | null;
  updated_at: string;
}

interface ResumeAttemptCardProps {
  attempt: AttemptItem;
  mockTestName?: string;
  onResume: (attemptId: string) => void;
}

export default function ResumeAttemptCard({
  attempt,
  mockTestName,
  onResume,
}: ResumeAttemptCardProps) {
  const t = useTranslations("practice");

  // Client-side remaining time calculation
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!attempt.started_at || !attempt.duration_seconds) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const startMs = new Date(attempt.started_at!).getTime();
      const durationMs = attempt.duration_seconds! * 1000;
      const endMs = startMs + durationMs;
      const nowMs = Date.now();
      const remainingSecs = Math.max(0, Math.floor((endMs - nowMs) / 1000));
      return remainingSecs;
    };

    // Initialize
    setTimeLeft(calculateTimeLeft());

    // Tick every second
    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [attempt.started_at, attempt.duration_seconds]);

  const formatRemainingTime = (seconds: number | null) => {
    if (seconds === null) return "--";
    if (seconds <= 0) return "Expired";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const getAttemptTypeName = () => {
    if (attempt.mock_test_id && mockTestName) {
      return mockTestName;
    }
    switch (attempt.attempt_type) {
      case "topic":
        return t("tabs.topic");
      case "subject":
        return t("tabs.subject");
      case "mixed":
        return t("tabs.mixed");
      case "previous_year":
        return t("tabs.pyq");
      case "full_mock":
        return t("tabs.mock");
      case "daily":
        return "Daily Practice";
      default:
        return "Practice Test";
    }
  };

  const formattedLastActive = attempt.updated_at
    ? new Date(attempt.updated_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--";

  return (
    <Card className="border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-slate-900/60 shadow-xl backdrop-blur-xl animate-pulse-subtle">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 tracking-wider w-fit block">
              {t("resume_section")}
            </span>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white tracking-tight">
                {getAttemptTypeName()}
              </h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <span>
                    {t("remaining_time")}:{" "}
                    <span className="font-semibold text-white">
                      {formatRemainingTime(timeLeft)}
                    </span>
                  </span>
                </div>
                <div className="h-3 w-px bg-slate-800 hidden sm:block" />
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  <span>
                    {t("last_updated")}: {formattedLastActive}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={() => onResume(attempt.id)}
            className="w-full md:w-auto bg-amber-600 text-white hover:bg-amber-500 font-bold px-6 flex items-center justify-center gap-2 group shrink-0"
          >
            <PlayCircle className="h-4 w-4 transition-transform group-hover:scale-110" />
            <span>{t("resume_attempt")}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
