import type { Metadata } from "next";
import { SectionPage } from "@/features/marketing/SectionPage";
import { PUBLIC_PAGE_META, pageMetadata } from "@/lib/seo/config";

export const metadata: Metadata = pageMetadata(PUBLIC_PAGE_META.about);

export default function AboutPage() {
  return (
    <SectionPage
      namespace="public_pages.about"
      sections={["mission", "why", "regional", "ai", "vision"]}
    />
  );
}
