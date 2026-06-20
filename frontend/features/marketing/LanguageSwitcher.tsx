"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LOCALE_NAME_KEY,
  locales,
  setLocaleCookie,
  type Locale,
} from "@/lib/i18n/locale";

/**
 * Public language switcher (T40). Lets anonymous visitors switch between
 * Assamese, Hindi, and English using the existing next-intl cookie mechanism —
 * no locale-prefixed URLs, no middleware, no new localization system.
 *
 * Setting the cookie + `router.refresh()` re-runs the server with the new
 * locale so translations update immediately, on the current URL. The 1-year
 * cookie makes the choice persist across refreshes.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const activeLocale = useLocale();
  const t = useTranslations("language");
  const router = useRouter();

  const handleChange = (locale: Locale) => {
    if (locale === activeLocale) return;
    setLocaleCookie(locale);
    router.refresh();
  };

  return (
    <div
      role="group"
      aria-label={t("language_selector")}
      className={cn("inline-flex items-center gap-1.5", className)}
    >
      <Globe aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
      <div className="inline-flex items-center divide-x divide-border overflow-hidden rounded-md border border-border">
        {locales.map((locale) => {
          const active = locale === activeLocale;
          return (
            <button
              key={locale}
              type="button"
              onClick={() => handleChange(locale)}
              aria-current={active ? "true" : undefined}
              aria-label={t(LOCALE_NAME_KEY[locale])}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {locale}
            </button>
          );
        })}
      </div>
    </div>
  );
}
