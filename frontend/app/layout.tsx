import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Inter, Noto_Sans_Bengali, Noto_Sans_Devanagari } from "next/font/google";
import Providers from "./providers";
import { AuthProvider } from "@/features/auth/AuthContext";
import { getCurrentUser } from "@/features/auth/serverAuth";
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

export const metadata: Metadata = {
  title: "PrepGenius AI",
  description: "Personalized Learning & Assessment Platform for Regional Competitive Exams",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  
  // Hydrate user session on server side
  const initialUser = await getCurrentUser();

  return (
    <html lang={locale} className="dark">
      <body className={`${inter.variable} ${bengali.variable} ${devanagari.variable} font-sans min-h-screen bg-slate-950 antialiased text-slate-100`}>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <AuthProvider initialUser={initialUser}>
              {children}
            </AuthProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
