import type { Metadata } from "next";
import { WaitlistPage } from "@/features/marketing/WaitlistPage";
import { PUBLIC_PAGE_META, pageMetadata } from "@/lib/seo/config";

export const metadata: Metadata = pageMetadata(PUBLIC_PAGE_META.waitlist);

export default function Waitlist() {
  return <WaitlistPage />;
}
