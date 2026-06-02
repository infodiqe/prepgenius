import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function EmptyResultState() {
  const t = useTranslations("results");

  return (
    <div className="flex h-96 items-center justify-center p-4">
      <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-md max-w-md w-full p-6 text-center shadow-xl">
        <CardHeader className="space-y-3 pb-3">
          <div className="mx-auto rounded-full bg-slate-950 p-4 w-fit text-slate-400">
            <AlertCircle className="h-10 w-10 text-amber-500" />
          </div>
          <CardTitle className="text-xl font-bold text-white">
            {t("empty_title")}
          </CardTitle>
          <CardDescription className="text-slate-400 text-sm">
            {t("empty_desc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <Button
            className="w-full bg-slate-800 text-white hover:bg-slate-700 flex items-center justify-center gap-2"
            onClick={() => {
              window.location.href = "/dashboard";
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t("back_dashboard")}</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
