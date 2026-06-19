"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useWorkspace } from "./WorkspaceProvider";

/**
 * Workspace switcher — Sprint 0 · S0-T08.
 *
 * An accessible segmented control over the workspaces the user can access
 * (`availableWorkspaces` from `useWorkspace`, derived via S0-T02 from roles).
 * Selecting a workspace calls `setActiveWorkspace`, which persists the choice
 * through the `WorkspaceProvider` (S0-T07) and updates the active workspace that
 * the nav reads (`navConfig[activeWorkspace]`, S0-T03).
 *
 * - Renders nothing when there is only one workspace (nothing to switch).
 * - Shows only accessible workspaces.
 * - Presentation-only: switching never grants authorization (route access is
 *   enforced server-side by the route guards, S0-T12).
 *
 * Placement (TopBar / mobile profile sheet) is owned by S0-T10/T11 — this ticket
 * builds the component only.
 */
export function WorkspaceSwitcher() {
  const t = useTranslations("workspace");
  const { activeWorkspace, availableWorkspaces, setActiveWorkspace } =
    useWorkspace();

  if (availableWorkspaces.length <= 1) return null;

  return (
    <nav
      role="group"
      aria-label={t("label")}
      className="flex gap-1 rounded-lg bg-muted p-1"
    >
      {availableWorkspaces.map((ws) => {
        const isActive = ws === activeWorkspace;
        return (
          <button
            key={ws}
            type="button"
            onClick={() => setActiveWorkspace(ws)}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "min-h-[44px] flex-1 rounded-md px-3 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-background hover:text-foreground",
            )}
          >
            {t(ws)}
          </button>
        );
      })}
    </nav>
  );
}
