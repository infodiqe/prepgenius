import type { Metadata } from "next";
import { SectionPage } from "@/features/marketing/SectionPage";
import { PUBLIC_PAGE_META, pageMetadata } from "@/lib/seo/config";

export const metadata: Metadata = pageMetadata(PUBLIC_PAGE_META.privacy);

export default function PrivacyPage() {
  return (
    <SectionPage
      namespace="public_pages.privacy"
      sections={[
        "collected",
        "usage",
        "cookies",
        "retention",
        "deletion",
        "contact",
      ]}
    />
  );
}
