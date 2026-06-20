import type { Metadata } from "next";
import { siteMetadata } from "@/lib/seo/config";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Inter, Noto_Sans_Bengali, Noto_Sans_Devanagari } from "next/font/google";
import Providers from "./providers";
import { AuthProvider } from "@/features/auth/AuthContext";
import { getCurrentUser } from "@/features/auth/serverAuth";
import { getThemeServer, THEME_COOKIE } from "@/lib/theme/cookies";
import { htmlThemeClass } from "@/lib/theme/htmlThemeClass";
import { ThemeProvider } from "@/features/theme/ThemeProvider";
import { getWorkspaceServer, WORKSPACE_COOKIE } from "@/lib/workspace/cookies";
import { WorkspaceProvider } from "@/features/workspace/WorkspaceProvider";
import { Toaster } from "@/features/feedback/Toaster";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const bengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-bengali",
});

const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-devanagari",
});

// Root metadata (title template, description, keywords, OpenGraph, Twitter,
// canonical base). Defined in lib/seo/config so it stays out of components and
// is unit-testable. See T36.
export const metadata: Metadata = siteMetadata;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  
  // Hydrate user session on server side
  const initialUser = await getCurrentUser();

  // Resolve theme from cookie on the server so the correct class is present in
  // the initial HTML (no flash of the wrong theme). Default is light (no class).
  const theme = await getThemeServer();

  // Resolve the persisted workspace (last-used) on the server; the provider
  // applies the access check + Student default once roles are known.
  const persistedWorkspace = await getWorkspaceServer();

  return (
    <html lang={locale} className={htmlThemeClass(theme)}>
      <body className={`${inter.variable} ${bengali.variable} ${devanagari.variable} font-sans min-h-screen antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <ThemeProvider initialTheme={theme} cookieName={THEME_COOKIE}>
              <AuthProvider initialUser={initialUser}>
                <WorkspaceProvider
                  persistedWorkspace={persistedWorkspace}
                  cookieName={WORKSPACE_COOKIE}
                >
                  {children}
                </WorkspaceProvider>
              </AuthProvider>
            </ThemeProvider>
          </Providers>
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
