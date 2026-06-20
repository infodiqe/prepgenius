"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

// Footer link groups. Anchor links (#features/#pricing) scroll within the
// landing page; route links (/about etc.) point at the intended public IA.
// NOTE: /about, /contact, /privacy, /terms pages are out of scope for T34-T35
// and are tracked as a follow-up — see the deliverable "Risks" section.
const GROUPS = [
  {
    key: "product",
    links: [
      { key: "features", href: "#features" },
      { key: "pricing", href: "/pricing" },
    ],
  },
  {
    key: "company",
    links: [
      { key: "about", href: "/about" },
      { key: "contact", href: "/contact" },
    ],
  },
  {
    key: "legal",
    links: [
      { key: "privacy", href: "/privacy" },
      { key: "terms", href: "/terms" },
    ],
  },
] as const;

/** Public marketing footer (T34). */
export function PublicFooter() {
  const t = useTranslations("landing.footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand + tagline */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                PG
              </span>
              <span className="text-lg tracking-tight">{t("brand")}</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              {t("tagline")}
            </p>
          </div>

          {/* Link groups */}
          {GROUPS.map((group) => (
            <nav key={group.key} aria-label={t(group.key)}>
              <h2 className="text-sm font-semibold text-foreground">
                {t(group.key)}
              </h2>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => {
                  const label = t(link.key);
                  return (
                    <li key={link.key}>
                      {link.href.startsWith("#") ? (
                        <a
                          href={link.href}
                          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-sm text-muted-foreground">
            {t("copyright", { year })}
          </p>
        </div>
      </div>
    </footer>
  );
}
