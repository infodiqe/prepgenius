import type { Metadata } from "next";

// Single source of truth for public SEO (T36). Metadata lives here — never
// hardcoded inside components — so the root layout, homepage, robots, and
// sitemap all stay consistent and unit-testable.

// Absolute origin used for canonical URLs, OpenGraph, robots, and the sitemap.
// Override per environment via NEXT_PUBLIC_SITE_URL; falls back to the domain
// configured in the deployment env (.env: DOMAIN=prepgenius.ai).
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://prepgenius.ai"
).replace(/\/+$/, "");

export const SITE_NAME = "PrepGenius";

export const SITE_DESCRIPTION =
  "AI-powered exam preparation platform for CTET, Assam TET, and regional competitive exams.";

export const SITE_KEYWORDS = [
  "CTET",
  "Assam TET",
  "Teacher Eligibility Test",
  "Mock Tests",
  "Exam Preparation",
  "AI Tutor",
];

// Authenticated / API surface that must never be indexed (T36 PART 3).
// Crawl guidance only — real access control is the middleware + backend auth.
export const DISALLOWED_PATHS = [
  "/dashboard",
  "/readiness",
  "/history",
  "/topic-mastery",
  "/trends",
  "/profile",
  "/practice",
  "/review",
  "/api",
];

// Public routes safe to advertise in the sitemap (T36 PART 4, extended in T37
// with the public informational pages).
export const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/pricing",
  "/waitlist",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
];

/**
 * Root metadata applied across the app. The OG/Twitter image is wired
 * automatically by the app/opengraph-image file convention, so it is not
 * listed here. Authenticated pages are kept out of search via robots.ts.
 */
export const siteMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

/**
 * Builds metadata for a public informational page (T37). Title flows through
 * the root "%s | PrepGenius" template; canonical + OG/Twitter are derived from
 * the path so every page stays consistent. Reuses the T36 foundation.
 */
export interface PublicPageMeta {
  title: string;
  description: string;
  path: string;
}

export function pageMetadata({
  title,
  description,
  path,
}: PublicPageMeta): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: path,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

// SEO copy for the public informational pages (T37). Kept here so metadata
// never lives inside components and stays unit-testable.
export const PUBLIC_PAGE_META: Record<
  "about" | "contact" | "privacy" | "terms" | "pricing" | "waitlist",
  PublicPageMeta
> = {
  pricing: {
    title: "Pricing",
    description:
      "PrepGenius pricing — start free with full practice, dashboards, and readiness tracking. AI-powered premium and institute plans coming soon.",
    path: "/pricing",
  },
  waitlist: {
    title: "Join the Waitlist",
    description:
      "Join the PrepGenius waitlist for early access to AI-powered exam preparation, launch updates, and priority institute onboarding.",
    path: "/waitlist",
  },
  about: {
    title: "About Us",
    description:
      "Learn about PrepGenius — our mission to make AI-powered, regional-first exam preparation accessible to every aspirant.",
    path: "/about",
  },
  contact: {
    title: "Contact Us",
    description:
      "Get in touch with the PrepGenius team for support, feedback, and partnership enquiries.",
    path: "/contact",
  },
  privacy: {
    title: "Privacy Policy",
    description:
      "How PrepGenius collects, uses, and protects your personal data, in line with India's DPDP Act.",
    path: "/privacy",
  },
  terms: {
    title: "Terms of Service",
    description:
      "The terms and conditions for using the PrepGenius exam preparation platform.",
    path: "/terms",
  },
};

/**
 * Homepage-specific metadata (T36 PART 2). `title.absolute` bypasses the
 * "%s | PrepGenius" template so the landing page title stays clean.
 */
export const homeMetadata: Metadata = {
  title: { absolute: SITE_NAME },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};
