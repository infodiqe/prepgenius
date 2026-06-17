import React from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/features/auth/serverAuth";
import { getExamsListServer } from "@/features/practice/practiceService";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Separator,
  Button,
} from "@/components/ui";
import { User, Target, Shield, Eye, Calendar, Languages, ShieldAlert } from "lucide-react";

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  const user = await getCurrentUser();
  const exams = await getExamsListServer();

  if (!user) {
    redirect("/login");
  }

  // Find user's target exam name from the fetched list
  const targetExamName = exams?.find((e) => e.id === user.target_exam_id)?.name || "";

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">{t("title")}</h2>
        <p className="text-sm text-slate-400 mt-1">{t("subtitle")}</p>
      </div>

      <Tabs defaultValue="profile" className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:inline-flex md:w-auto h-auto bg-slate-900/60 p-1 gap-1 border border-slate-800">
          <TabsTrigger
            value="profile"
            className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-slate-950 text-slate-400 data-[state=active]:text-white font-semibold"
          >
            <User className="h-4 w-4" />
            <span>{t("tabs.profile")}</span>
          </TabsTrigger>
          <TabsTrigger
            value="exam"
            className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-slate-950 text-slate-400 data-[state=active]:text-white font-semibold"
          >
            <Target className="h-4 w-4" />
            <span>{t("tabs.exam")}</span>
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-slate-950 text-slate-400 data-[state=active]:text-white font-semibold"
          >
            <Shield className="h-4 w-4" />
            <span>{t("tabs.security")}</span>
          </TabsTrigger>
          <TabsTrigger
            value="privacy"
            className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-slate-950 text-slate-400 data-[state=active]:text-white font-semibold"
          >
            <Eye className="h-4 w-4" />
            <span>{t("tabs.privacy")}</span>
          </TabsTrigger>
        </TabsList>

        {/* ── PROFILE SECTION ── */}
        <TabsContent value="profile" className="space-y-4">
          <Card className="border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <User className="h-5 w-5 text-blue-400" />
                {t("profile.title")}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {t("profile.subtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {t("profile.full_name")}
                  </span>
                  <div className="h-10 w-full rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-300">
                    {user.full_name}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {t("profile.email")}
                  </span>
                  <div className="h-10 w-full rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-400 bg-slate-900/20 select-none">
                    {user.email}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {t("profile.phone")}
                  </span>
                  <div className="h-10 w-full rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-300">
                    {user.phone_e164 || "-"}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {t("profile.language")}
                  </span>
                  <div className="h-10 w-full rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-300 flex items-center gap-2">
                    <Languages className="h-4 w-4 text-slate-500" />
                    <span>
                      {user.preferred_language === "as"
                        ? "অসমীয়া (Assamese)"
                        : user.preferred_language === "hi"
                        ? "हिन्दी (Hindi)"
                        : "English"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── EXAM TARGET SECTION ── */}
        <TabsContent value="exam" className="space-y-4">
          <Card className="border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-400" />
                {t("exam.title")}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {t("exam.subtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {user.target_exam_id ? (
                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">{t("exam.select_exam")}</h4>
                    <p className="text-lg font-extrabold text-blue-400">{targetExamName}</p>
                  </div>
                  {user.exam_date && (
                    <div className="flex items-center gap-2 rounded-full bg-blue-500/10 px-3.5 py-1.5 text-xs font-semibold text-blue-300">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{user.exam_date}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 text-sm text-amber-400 font-medium">
                  {t("exam.no_exam_selected")}
                </div>
              )}

              <Separator className="border-slate-800/60" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {t("exam.select_exam")}
                  </span>
                  <div className="h-10 w-full rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-550 flex items-center justify-between">
                    <span>{targetExamName || t("exam.no_exam_selected")}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {t("exam.date")}
                  </span>
                  <div className="h-10 w-full rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-550 flex items-center justify-between">
                    <span>{user.exam_date || "-"}</span>
                    <Calendar className="h-4 w-4 text-slate-500" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SECURITY SECTION ── */}
        <TabsContent value="security" className="space-y-4">
          <Card className="border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-400" />
                {t("security.title")}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {t("security.subtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {t("security.current_password")}
                  </span>
                  <div className="h-10 w-full rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-600 select-none">
                    ••••••••••••
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {t("security.new_password")}
                  </span>
                  <div className="h-10 w-full rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-600 select-none">
                    ••••••••••••
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {t("security.confirm_password")}
                  </span>
                  <div className="h-10 w-full rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-600 select-none">
                    ••••••••••••
                  </div>
                </div>

                <Button disabled className="w-full md:w-auto font-semibold text-white bg-blue-600/50 cursor-not-allowed">
                  {t("security.submit")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PRIVACY SECTION ── */}
        <TabsContent value="privacy" className="space-y-4">
          <Card className="border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-400" />
                {t("privacy.title")}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {t("privacy.subtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Export Card */}
                <div className="p-5 rounded-lg border border-slate-800 bg-slate-950/30 flex flex-col justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-200">{t("privacy.export_title")}</h4>
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{t("privacy.export_desc")}</p>
                  </div>
                  <Button disabled className="w-full font-semibold text-white bg-slate-800/50 cursor-not-allowed">
                    {t("privacy.export_btn")}
                  </Button>
                </div>

                {/* Delete Card */}
                <div className="p-5 rounded-lg border border-red-900/30 bg-red-950/5 flex flex-col justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-red-400 flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4" />
                      {t("privacy.delete_title")}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{t("privacy.delete_desc")}</p>
                  </div>
                  <Button disabled className="w-full font-semibold text-white bg-red-600/50 cursor-not-allowed">
                    {t("privacy.delete_btn")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
