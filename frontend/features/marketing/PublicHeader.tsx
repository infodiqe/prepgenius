"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "./LanguageSwitcher";

// Anchor targets resolve to sections rendered on the landing page.
const SECTION_LINKS = [
  { key: "features", href: "#features" },
  { key: "pricing", href: "#pricing" },
  { key: "faq", href: "#faq" },
] as const;

/**
 * Public marketing header (T34). Unauthenticated visitors only — the
 * authenticated app uses its own AppShell/Sidebar nav, which is untouched.
 */
export function PublicHeader() {
  const t = useTranslations("landing.header");
  const [menuOpen, setMenuOpen] = React.useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-foreground"
          onClick={closeMenu}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            PG
          </span>
          <span className="text-lg tracking-tight">{t("brand")}</span>
        </Link>

        {/* Desktop nav */}
        <nav
          aria-label={t("primary_nav")}
          className="hidden items-center gap-8 md:flex"
        >
          {SECTION_LINKS.map((link) => (
            <a
              key={link.key}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t(link.key)}
            </a>
          ))}
        </nav>

        {/* Desktop auth actions */}
        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">{t("login")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">{t("register")}</Link>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="public-mobile-menu"
          aria-label={menuOpen ? t("close_menu") : t("open_menu")}
          onClick={() => setMenuOpen((prev) => !prev)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          {menuOpen ? (
            <X aria-hidden="true" className="h-5 w-5" />
          ) : (
            <Menu aria-hidden="true" className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile menu panel — conditionally rendered so it is absent until opened */}
      {menuOpen && (
        <nav
          id="public-mobile-menu"
          aria-label={t("mobile_nav")}
          className={cn(
            "border-t border-border bg-background px-4 pb-4 pt-2 md:hidden",
          )}
        >
          <ul className="flex flex-col">
            {SECTION_LINKS.map((link) => (
              <li key={link.key}>
                <a
                  href={link.href}
                  onClick={closeMenu}
                  className="block py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t(link.key)}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-border pt-3">
            <LanguageSwitcher />
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <Button asChild variant="outline" className="w-full">
              <Link href="/login" onClick={closeMenu}>
                {t("login")}
              </Link>
            </Button>
            <Button asChild className="w-full">
              <Link href="/register" onClick={closeMenu}>
                {t("register")}
              </Link>
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}
