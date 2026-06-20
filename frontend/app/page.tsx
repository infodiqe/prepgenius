import React from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LandingPage } from "@/features/marketing/LandingPage";
import { homeMetadata } from "@/lib/seo/config";

// Per-page metadata for the public landing page (T36 PART 2).
export const metadata: Metadata = homeMetadata;

export default async function RootPage() {
  const cookieStore = await cookies();
  const hasToken = !!cookieStore.get("access_token")?.value;

  // Authenticated users keep their existing destination (T35 PART 3).
  if (hasToken) {
    redirect("/dashboard");
  }

  // Unauthenticated visitors see the public marketing landing page.
  return <LandingPage />;
}
