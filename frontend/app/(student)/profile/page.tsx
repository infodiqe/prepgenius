import React from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Coins, Eye, Shield, Target, User } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger, ErrorState } from "@/components/ui";
import { getCurrentUser } from "@/features/auth/serverAuth";
import { getExamsListServer } from "@/features/practice/practiceService";
import {
  getCreditBalanceServer,
  getCreditLedgerServer,
} from "@/features/credits/creditService";
import { CreditBalanceCard } from "@/features/credits/components/CreditBalanceCard";
import { CreditHistoryTable } from "@/features/credits/components/CreditHistoryTable";
import { DataExportCard } from "@/features/profile/DataExportCard";
import { DeleteAccountPanel } from "@/features/profile/DeleteAccountPanel";
import { ExamPreferencesForm } from "@/features/profile/ExamPreferencesForm";
import { PasswordChangeForm } from "@/features/profile/PasswordChangeForm";
import { ProfileDetailsForm } from "@/features/profile/ProfileDetailsForm";

export default async function ProfilePage() {
  const t = await getTranslations("settings");
  const ct = await getTranslations("credits");
  const [user, examList, creditSummary, creditLedger] = await Promise.all([
    getCurrentUser(),
    getExamsListServer(),
    getCreditBalanceServer(),
    getCreditLedgerServer(),
  ]);

  if (!user) {
    redirect("/login");
  }

  const exams = (examList ?? []).map((exam) => ({
    id: exam.id,
    name: exam.name,
    code: exam.code,
    is_active: exam.is_active,
  }));

  return (
    <main className="space-y-6 pb-12">
      <header>
        <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      <Tabs defaultValue="profile" className="w-full space-y-6">
        <TabsList
          className="grid h-auto w-full grid-cols-2 gap-1 border border-border bg-muted/60 p-1 sm:grid-cols-5 lg:w-auto"
          aria-label={t("tabs.label")}
        >
          <TabsTrigger value="profile" className="flex items-center gap-2 py-2.5">
            <User className="h-4 w-4" aria-hidden="true" />
            <span>{t("tabs.profile")}</span>
          </TabsTrigger>
          <TabsTrigger value="exam" className="flex items-center gap-2 py-2.5">
            <Target className="h-4 w-4" aria-hidden="true" />
            <span>{t("tabs.exam")}</span>
          </TabsTrigger>
          <TabsTrigger value="credits" className="flex items-center gap-2 py-2.5">
            <Coins className="h-4 w-4" aria-hidden="true" />
            <span>{t("tabs.credits")}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 py-2.5">
            <Shield className="h-4 w-4" aria-hidden="true" />
            <span>{t("tabs.security")}</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2 py-2.5">
            <Eye className="h-4 w-4" aria-hidden="true" />
            <span>{t("tabs.privacy")}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileDetailsForm user={user} />
        </TabsContent>
        <TabsContent value="exam">
          <ExamPreferencesForm user={user} exams={exams} />
        </TabsContent>
        <TabsContent value="credits">
          <section aria-labelledby="credits-heading" className="space-y-6">
            <div>
              <h2 id="credits-heading" className="text-xl font-semibold text-foreground">
                {ct("title")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{ct("subtitle")}</p>
            </div>

            {/* A failed balance/ledger fetch (null) must not render as "no
                credit activity" — show the error state with Retry. */}
            {creditSummary === null || creditLedger === null ? (
              <ErrorState />
            ) : (
              <>
                <CreditBalanceCard summary={creditSummary} />

                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-foreground">
                    {ct("history_title")}
                  </h3>
                  <CreditHistoryTable
                    entries={creditLedger.results ?? []}
                    truncated={Boolean(creditLedger.next)}
                  />
                </div>
              </>
            )}
          </section>
        </TabsContent>
        <TabsContent value="security">
          <PasswordChangeForm />
        </TabsContent>
        <TabsContent value="privacy">
          <section aria-labelledby="privacy-heading" className="space-y-4">
            <div>
              <h2 id="privacy-heading" className="text-xl font-semibold text-foreground">
                {t("privacy.title")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("privacy.subtitle")}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DataExportCard />
              <DeleteAccountPanel />
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </main>
  );
}

