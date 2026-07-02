"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import Sidebar from "@/features/nav/Sidebar";
import TopBar from "@/features/nav/TopBar";
import BottomTabBar from "@/features/nav/BottomTabBar";
import { useWorkspace } from "@/features/workspace/WorkspaceProvider";

const MAIN_CONTENT_ID = "main-content";

/**
 * AppShell — generalized navigation shell (Sprint 0 · S0-T11).
 *
 * Workspace-agnostic structure (Sidebar + TopBar + BottomTabBar) shared by the
 * student, review and admin workspaces. Workspace-specific items come from
 * `navConfig` via Sidebar/BottomTabBar (S0-T09); the active workspace is exposed
 * as `data-workspace` for scoped styling/testing — the structure itself is the
 * same for every workspace.
 *
 * Player bypass: the mock/exam player renders its own full-viewport chrome, so
 * `/practice/{attemptId}` renders children with no app chrome — exactly as
 * before (the standard shell is not in the DOM at all on those routes).
 *
 * No authorization here — route access is enforced by the route-group guards
 * (S0-T12).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activeWorkspace } = useWorkspace();
  const tNav = useTranslations("nav");

  // Player route: /practice/{attemptId} (any non-empty segment after /practice/)
  const isPlayerRoute =
    pathname.startsWith("/practice/") && pathname !== "/practice";

  if (isPlayerRoute) {
    // Player renders its own full-viewport shell — no app chrome at all.
    return <div className="h-screen w-screen overflow-hidden">{children}</div>;
  }

  return (
    <div
      data-workspace={activeWorkspace}
      className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans"
    >
      {/* Skip link — first focusable element; jumps past the chrome to main. */}
      <a
        href={`#${MAIN_CONTENT_ID}`}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {tNav("skip_to_content")}
      </a>

      {/* Collapsible desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Bar */}
        <TopBar />

        {/* Dynamic page contents */}
        <main
          id={MAIN_CONTENT_ID}
          role="main"
          tabIndex={-1}
          className="flex-1 overflow-y-auto px-4 py-6 md:px-8 pb-24 md:pb-6 bg-background relative focus:outline-none"
        >
          <div className="mx-auto max-w-7xl w-full">{children}</div>
        </main>

        {/* Mobile Bottom Tab Bar */}
        <BottomTabBar />
      </div>
    </div>
  );
}
