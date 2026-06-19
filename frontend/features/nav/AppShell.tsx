"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/features/nav/Sidebar";
import TopBar from "@/features/nav/TopBar";
import BottomTabBar from "@/features/nav/BottomTabBar";
import { useWorkspace } from "@/features/workspace/WorkspaceProvider";

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
      {/* Collapsible desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Bar */}
        <TopBar />

        {/* Dynamic page contents */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 pb-24 md:pb-6 bg-background relative">
          <div className="mx-auto max-w-7xl w-full">{children}</div>
        </main>

        {/* Mobile Bottom Tab Bar */}
        <BottomTabBar />
      </div>
    </div>
  );
}
