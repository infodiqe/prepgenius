import type { Metadata } from "next";
import { ContactPage } from "@/features/marketing/ContactPage";
import { PUBLIC_PAGE_META, pageMetadata } from "@/lib/seo/config";

export const metadata: Metadata = pageMetadata(PUBLIC_PAGE_META.contact);

export default function Contact() {
  return <ContactPage />;
}
