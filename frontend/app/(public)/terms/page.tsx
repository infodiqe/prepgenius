import type { Metadata } from "next";
import { SectionPage } from "@/features/marketing/SectionPage";
import { PUBLIC_PAGE_META, pageMetadata } from "@/lib/seo/config";

export const metadata: Metadata = pageMetadata(PUBLIC_PAGE_META.terms);

export default function TermsPage() {
  return (
    <SectionPage
      namespace="public_pages.terms"
      sections={[
        "responsibilities",
        "account",
        "conduct",
        "ai_disclaimer",
        "liability",
        "availability",
      ]}
    />
  );
}
