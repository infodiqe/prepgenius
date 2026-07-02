import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, BookOpen } from "lucide-react";

export default function EmptyAnalyticsState() {
  const t = useTranslations("analytics");

  return (
    <div className="flex h-96 items-center justify-center p-4">
      <Card className="border-border bg-card backdrop-blur-md max-w-md w-full p-6 text-center shadow-xl">
        <CardHeader className="space-y-3 pb-3">
          <div className="mx-auto rounded-full bg-muted p-4 w-fit text-muted-foreground">
            <BarChart3 className="h-10 w-10 text-indigo-400 animate-pulse" />
          </div>
          <CardTitle className="text-xl font-bold text-foreground">
            {t("no_history_title")}
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            {t("no_history_desc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-500 font-semibold text-primary-foreground flex items-center justify-center gap-2"
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
