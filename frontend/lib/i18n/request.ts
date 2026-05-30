import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

// Supported locales — Assamese is the default (PRD v4 §4.1)
export const locales = ["as", "en", "hi"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "as";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("locale")?.value;
  const locale: Locale =
    localeCookie && (locales as readonly string[]).includes(localeCookie)
      ? (localeCookie as Locale)
      : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
