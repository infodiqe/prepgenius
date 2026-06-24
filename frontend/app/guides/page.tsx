import * as React from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PublicHeader } from "@/features/marketing/PublicHeader";
import { PublicFooter } from "@/features/marketing/PublicFooter";
import { GuideIndexPage } from "@/features/guides/GuideIndexPage";
import { fetchGuides } from "@/lib/cms/api";
import { defaultLocale } from "@/lib/i18n/locale";
import { pageMetadata } from "@/lib/seo/config";

async function resolveLocale(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get("locale")?.value ?? defaultLocale;
}

export const metadata: Metadata = pageMetadata({
  title: "Study Guides",
  description:
    "Free, exam-focused study guides — preparation strategies, exam patterns, eligibility, and the best books for your exam.",
  path: "/guides",
});

export default async function GuidesPage() {
  const locale = await resolveLocale();
  const guides = await fetchGuides(locale);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">
        <GuideIndexPage guides={guides} />
      </main>
      <PublicFooter />
    </div>
  );
}
