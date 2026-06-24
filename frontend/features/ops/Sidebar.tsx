"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { visibleOpsNavForPersonas, type OpsPersona } from "./opsNav";
import { OpsNavItems } from "./OpsNavItems";

/**
 * Ops Platform Sidebar — OPS-HARDEN-02 (desktop rail).
 *
 * Role-aware, config-driven navigation: items come from
 * `visibleOpsNavForPersonas(personas)` (`opsNav.ts`) — there are no hardcoded
 * items or role checks in this JSX, and no hardcoded persona default. The
 * `personas` are derived from the authenticated user's RBAC roles upstream
 * (`AppShell` → `deriveOpsPersonas`). Item markup (live links + "Coming Soon"
 * disabled destinations) is shared with the mobile nav via `OpsNavItems`.
 *
 * Hidden below `md`; the mobile drawer (`MobileNav`) covers small screens.
 * Personas are presentation-only; authorization is server-side. Ops UI is
 * English-only.
 */
export default function Sidebar({
  personas,
}: {
  personas: readonly OpsPersona[];
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const items = visibleOpsNavForPersonas(personas);

  return (
    <aside
      className={cn(
        "hidden md:flex h-screen flex-col border-r border-border bg-card transition-all duration-200",
        collapsed ? "w-20" : "w-64",
      )}
    >
      {/* Brand header */}
      <div className="flex h-16 items-center justify-between border-b border-border px-6">
        <Link
          href="/ops"
          className="flex items-center gap-2 rounded font-bold text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-sm text-primary-foreground">
            PG
          </div>
          {!collapsed && (
            <span className="text-base tracking-tight">PrepGenius Ops</span>
          )}
        </Link>
      </div>

      {/* Nav list (config-driven) */}
      <nav
        aria-label="Operations navigation"
        className="flex-1 space-y-1 overflow-y-auto px-3 py-4"
      >
        <OpsNavItems items={items} pathname={pathname} collapsed={collapsed} />
      </nav>

      {/* Collapse toggle */}
      <div className="flex justify-end border-t border-border p-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="h-10 w-10 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          )}
        </Button>
      </div>
    </aside>
  );
}
