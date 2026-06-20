import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, defaultLocale, locales, type Locale } from "./locale";

// Locale constants now live in ./locale (client-safe). Re-exported here so any
// existing imports from this module keep working. Resolution logic is unchanged
// (cookie-based, no locale-prefixed URLs) — see PRD v4 §4.1.
export { locales, defaultLocale };
export type { Locale };

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale =
    localeCookie && (locales as readonly string[]).includes(localeCookie)
      ? (localeCookie as Locale)
      : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
