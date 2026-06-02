import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, BookOpen } from "lucide-react";

export default function EmptyAnalyticsState() {
  const t = useTranslations("analytics");

  return (
    <div className="flex h-96 items-center justify-center p-4">
      <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-md max-w-md w-full p-6 text-center shadow-xl">
        <CardHeader className="space-y-3 pb-3">
          <div className="mx-auto rounded-full bg-slate-950 p-4 w-fit text-slate-400">
            <BarChart3 className="h-10 w-10 text-indigo-400 animate-pulse" />
          </div>
          <CardTitle className="text-xl font-bold text-white">
            {t("no_history_title")}
          </CardTitle>
          <CardDescription className="text-slate-400 text-sm">
            {t("no_history_desc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-500 font-semibold text-white flex items-center justify-center gap-2"
            onClick={() => {
              window.location.href = "/practice";
            }}
          >
            <BookOpen className="h-4 w-4" />
            <span>{t("practice_now")}</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
