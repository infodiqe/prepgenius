import type { Metadata } from "next";
import { PricingPage } from "@/features/marketing/PricingPage";
import { PUBLIC_PAGE_META, pageMetadata } from "@/lib/seo/config";

export const metadata: Metadata = pageMetadata(PUBLIC_PAGE_META.pricing);

export default function Pricing() {
  return <PricingPage />;
}
