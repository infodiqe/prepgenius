import * as React from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/features/marketing/PublicHeader";
import { PublicFooter } from "@/features/marketing/PublicFooter";
import { GuideDetailPage } from "@/features/guides/GuideDetailPage";
import { fetchGuide } from "@/lib/cms/api";
import { defaultLocale } from "@/lib/i18n/locale";
import { pageMetadata } from "@/lib/seo/config";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function resolveLocale(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get("locale")?.value ?? defaultLocale;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await resolveLocale();
  const guide = await fetchGuide(slug, locale);
  if (!guide) return {};
  return pageMetadata({
    title: guide.meta_title || guide.title,
    description: guide.meta_description,
    path: `/guides/${slug}`,
  });
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const locale = await resolveLocale();
  const guide = await fetchGuide(slug, locale);

  // Unknown / unpublished / non-guide slug → 404.
  if (!guide) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">
        <GuideDetailPage guide={guide} />
      </main>
      <PublicFooter />
    </div>
  );
}
