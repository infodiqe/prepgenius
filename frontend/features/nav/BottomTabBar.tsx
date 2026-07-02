"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/features/workspace/WorkspaceProvider";
import { navConfig } from "@/lib/nav/navConfig";
import { getNavIcon } from "./navIcons";

export default function BottomTabBar() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const { activeWorkspace } = useWorkspace();

  // Navigation is derived from the active workspace — no hardcoded items.
  const items = navConfig[activeWorkspace].bottomTabs;

  return (
    <nav
      aria-label={t("mobile_nav_aria")}
      className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-border bg-background/90 backdrop-blur-lg md:hidden"
    >
      <div className="mx-auto flex h-full max-w-md items-center justify-around px-2">
        {items.map(({ href, labelKey, icon }) => {
          const Icon = getNavIcon(icon);
          const label = t(labelKey);
          const isActive = pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-12 w-16 flex-col items-center justify-center rounded-lg text-muted-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive ? "text-primary font-semibold" : "hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="mt-1 text-[10px] tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
