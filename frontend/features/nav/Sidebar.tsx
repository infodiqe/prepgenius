"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/features/workspace/WorkspaceProvider";
import { navConfig } from "@/lib/nav/navConfig";
import { getNavIcon } from "./navIcons";

export default function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const { activeWorkspace } = useWorkspace();
  const [collapsed, setCollapsed] = useState(false);

  // Navigation is derived from the active workspace — no hardcoded items.
  const items = navConfig[activeWorkspace].sidebar;
  const brandHref = items[0]?.href ?? "/dashboard";

  return (
    <aside
      aria-label={t("sidebar_nav_aria")}
      className={cn(
        "hidden md:flex h-screen flex-col border-r border-border bg-card backdrop-blur-xl transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-border">
        <Link
          href={brandHref}
          className="flex items-center gap-2 font-bold text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground text-sm">
            PG
          </div>
          {!collapsed && <span className="text-lg tracking-wider">PrepGenius</span>}
        </Link>
      </div>

      {/* Nav List */}
      <nav className="flex-1 space-y-1.5 px-3 py-4">
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
                "flex h-12 items-center gap-4 rounded-lg px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Toggle Button */}
      <div className="p-4 border-t border-border flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-10 w-10 text-muted-foreground hover:text-foreground"
          aria-label={collapsed ? t("expand_sidebar") : t("collapse_sidebar")}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>
    </aside>
  );
}
