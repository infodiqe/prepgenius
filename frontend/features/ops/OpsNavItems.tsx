"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { OpsNavItem } from "./opsNav";
import { getOpsNavIcon } from "./opsIcons";

/**
 * Shared Ops navigation item renderer (OPS-HARDEN-02 Part B/C).
 *
 * Single rendering surface reused by both the desktop `Sidebar` and the mobile
 * `MobileNav`, so the nav config and item markup are never duplicated. Items
 * come from `visibleOpsNavForPersonas` (`opsNav.ts`) — this component renders
 * what it is given, in order.
 *
 * Two item shapes:
 *   - **Live** workspace → a `next/link` (with `aria-current` when active). On
 *     navigation it calls `onNavigate` so an overlay nav can close itself.
 *   - **Coming Soon** workspace (`comingSoon`) → a non-link, `aria-disabled`
 *     element with a "Coming Soon" badge. It is keyboard-focusable (so it is
 *     discoverable) but has no href and no activation, so it can never navigate
 *     or 404. Visual + textual distinction (never colour alone).
 */

/** The Overview root ("/ops") is a prefix of every sub-route, so it only matches
 * exactly; deeper workspaces also match their subtree. */
export function isOpsNavItemActive(
  pathname: string | null | undefined,
  href: string,
): boolean {
  if (href === "/ops") return pathname === "/ops";
  return pathname === href || !!pathname?.startsWith(`${href}/`);
}

const ITEM_BASE =
  "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function OpsNavItems({
  items,
  pathname,
  collapsed = false,
  onNavigate,
}: {
  items: readonly OpsNavItem[];
  pathname: string | null | undefined;
  /** Icon-only desktop rail mode (labels + badges hidden). */
  collapsed?: boolean;
  /** Called when a live link is activated (used by overlay navs to close). */
  onNavigate?: () => void;
}) {
  return (
    <>
      {items.map((item) => {
        const Icon = getOpsNavIcon(item.icon);

        if (item.comingSoon) {
          return (
            <span
              key={item.id}
              role="link"
              aria-disabled="true"
              aria-label={`${item.label} (coming soon)`}
              title={collapsed ? `${item.label} (coming soon)` : undefined}
              tabIndex={0}
              className={cn(
                ITEM_BASE,
                "cursor-not-allowed text-muted-foreground/60",
                collapsed && "justify-center",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {!collapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  <Badge
                    variant="secondary"
                    className="ml-auto shrink-0 px-1.5 py-0 text-[10px] font-medium uppercase tracking-wide"
                  >
                    Coming Soon
                  </Badge>
                </>
              )}
            </span>
          );
        }

        const isActive = isOpsNavItemActive(pathname, item.href);
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            onClick={onNavigate}
            className={cn(
              ITEM_BASE,
              collapsed && "justify-center",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </>
  );
}
