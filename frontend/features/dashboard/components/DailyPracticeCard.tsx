"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button } from "@/components/ui";
import { BookOpen, Sparkles } from "lucide-react";

export default function DailyPracticeCard() {
  const t = useTranslations("dashboard");
  const router = useRouter();

  return (
    <Card className="relative overflow-hidden border-blue-500/20 bg-gradient-to-br from-blue-950/60 to-slate-900/60 shadow-2xl backdrop-blur-xl hover:border-blue-500/30 transition-colors">
      {/* Visual background sparkles decorations */}
      <div className="absolute right-0 top-0 -mr-6 -mt-6 h-24 w-24 rounded-full bg-blue-500/10 blur-xl" />
      <div className="absolute left-10 bottom-0 -ml-6 -mb-6 h-20 w-20 rounded-full bg-indigo-500/10 blur-lg" />

      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2 text-blue-400">
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("daily_recommendation_label")}
          </span>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-white">
          {t("start_today_practice")}
        </CardTitle>
        <CardDescription className="text-sm text-slate-400">
          {t("start_practice_desc")}
        </CardDescription>
      </CardHeader>

      <CardContent className="text-sm text-slate-300">
        {t("daily_practice_content")}
      </CardContent>

      <CardFooter>
        <Button
          onClick={() => router.push("/practice")}
          size="lg"
          className="w-full bg-blue-600 font-semibold text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 py-6 text-base"
        >
          <BookOpen className="mr-2 h-5 w-5" aria-hidden="true" />
          {t("practice_now")}
        </Button>
      </CardFooter>
    </Card>
  );
}
