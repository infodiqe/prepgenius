"use client";

import React, { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { MobileNav } from "./MobileNav";
import { CommandPalette } from "./CommandPalette";
import { NotificationDrawer } from "./NotificationDrawer";
import { useAuth } from "@/features/auth/AuthContext";
import { deriveOpsPersonas } from "./opsAccess";

const OPS_MAIN_ID = "ops-main-content";

/**
 * Ops Platform AppShell — OPS-HARDEN-02.
 *
 * Composes the operations chrome: a role-aware Sidebar (desktop) + MobileNav
 * (drawer), a TopBar banner, an optional WorkspaceHeader slot, and the main
 * content area. The shell owns open/close state for the CommandPalette (also via
 * Cmd/Ctrl+K), the NotificationDrawer, and the mobile nav.
 *
 * Navigation visibility is derived from the **authenticated user's RBAC roles**
 * (`deriveOpsPersonas`) — there is no hardcoded persona default. A user with no
 * Ops personas sees no workspaces (the route guard already redirects them away).
 *
 * No authorization here — route access is enforced by `OpsRouteGuard` (the
 * `(ops)` layout) and the API. Personas are presentation-only.
 */
export function AppShell({
  children,
  header,
}: {
  children: React.ReactNode;
  /** Optional WorkspaceHeader element rendered above the scrollable content. */
  header?: React.ReactNode;
}) {
  const { user } = useAuth();
  const personas = deriveOpsPersonas(user?.roles ?? []);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div
      data-workspace="ops"
      className="flex h-screen w-screen overflow-hidden bg-background font-sans text-foreground"
    >
      {/* Skip link — first focusable element; jumps past the chrome to main. */}
      <a
        href={`#${OPS_MAIN_ID}`}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Skip to main content
      </a>

      <Sidebar personas={personas} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          onOpenSearch={() => setPaletteOpen(true)}
          onOpenNotifications={() => setNotificationsOpen(true)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        {header}

        <main
          id={OPS_MAIN_ID}
          role="main"
          tabIndex={-1}
          className="flex-1 overflow-y-auto bg-background focus:outline-none"
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Overlays — always mounted so global shortcuts work anywhere */}
      <MobileNav
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        personas={personas}
      />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <NotificationDrawer
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
      />
    </div>
  );
}
