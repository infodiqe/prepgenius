import * as React from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/features/marketing/PublicHeader";
import { PublicFooter } from "@/features/marketing/PublicFooter";
import { BlockRenderer } from "@/features/cms/BlockRenderer";
import { fetchCmsPage } from "@/lib/cms/api";
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
  const page = await fetchCmsPage(slug, locale);
  if (!page) return {};
  return pageMetadata({
    title: page.meta_title || page.title,
    description: page.meta_description,
    path: `/content/${slug}`,
  });
}

export default async function ContentPage({ params }: PageProps) {
  const { slug } = await params;
  const locale = await resolveLocale();
  const page = await fetchCmsPage(slug, locale);

  // Unknown / unpublished slug → 404.
  if (!page) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">
        {page.blocks.map((block, index) => (
          <BlockRenderer key={index} block={block} />
        ))}
      </main>
      <PublicFooter />
    </div>
  );
}
