"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Workspace } from "@/lib/workspace/cookies";
import { useAuth } from "@/features/auth/AuthContext";
import {
  deriveWorkspaces,
  hasWorkspaceAccess,
  resolveActiveWorkspace,
} from "@/lib/rbac/workspaces";
import { buildWorkspaceCookie } from "@/lib/workspace/workspaceActions";

/**
 * Workspace context + provider — Sprint 0 · S0-T07.
 *
 * Derives the user's roles from `AuthContext` (no refetch) and resolves the
 * active workspace with the approved rule (S0-T02 `resolveActiveWorkspace`):
 *   1. last-used wins,
 *   2. open the persisted workspace if still accessible,
 *   3. otherwise default to Student.
 *
 * **Presentation-only.** Selecting a workspace never grants authorization;
 * `setActiveWorkspace` ignores any workspace the roles don't grant, and route
 * access stays enforced server-side by the route-group guards (S0-T12).
 *
 * Hydration: state is seeded from the same inputs available on the server
 * (`AuthContext.initialUser.roles` + the persisted cookie passed as a prop), so
 * the SSR and first client render agree. The cookie name is injected via
 * `cookieName` (single source `WORKSPACE_COOKIE`) so this client module never
 * imports the server-only `next/headers`.
 */

interface WorkspaceContextValue {
  activeWorkspace: Workspace;
  availableWorkspaces: Workspace[];
  setActiveWorkspace: (workspace: Workspace) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(
  undefined,
);

export function WorkspaceProvider({
  persistedWorkspace,
  cookieName,
  children,
}: {
  persistedWorkspace: Workspace | null;
  cookieName: string;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const roles = useMemo(() => user?.roles ?? [], [user]);
  const availableWorkspaces = useMemo(() => deriveWorkspaces(roles), [roles]);

  const [activeWorkspace, setActiveState] = useState<Workspace>(() =>
    resolveActiveWorkspace(roles, persistedWorkspace),
  );

  const setActiveWorkspace = useCallback(
    (workspace: Workspace) => {
      // Presentation-only: ignore a selection the roles don't grant.
      if (!hasWorkspaceAccess(roles, workspace)) return;
      document.cookie = buildWorkspaceCookie(cookieName, workspace);
      setActiveState(workspace);
    },
    [roles, cookieName],
  );

  // If roles change so the active workspace is no longer accessible, demote to
  // the resolved default (Student). No-op on initial mount (the resolved active
  // workspace is always accessible).
  useEffect(() => {
    if (!hasWorkspaceAccess(roles, activeWorkspace)) {
      setActiveState(resolveActiveWorkspace(roles, null));
    }
  }, [roles, activeWorkspace]);

  const value = useMemo(
    () => ({ activeWorkspace, availableWorkspaces, setActiveWorkspace }),
    [activeWorkspace, availableWorkspaces, setActiveWorkspace],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}
