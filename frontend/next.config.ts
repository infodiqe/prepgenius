import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = {
  // Keep bundles lean for low-end Android (PRD v4 §4)
  experimental: {
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
  },
  images: {
    remotePatterns: [],
  },
  // Never expose backend secrets to the client
  serverRuntimeConfig: {
    API_URL: process.env.API_URL ?? "http://django:8000",
  },
  publicRuntimeConfig: {
    API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1",
  },
};

export default withNextIntl(nextConfig);
