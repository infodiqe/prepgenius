import React from "react";
import { OpsRouteGuard } from "@/features/ops/OpsRouteGuard";

/**
 * Operations Platform route-group layout (OPS-HARDEN-02 Part A).
 *
 * Wraps every `(ops)` route in the `OpsRouteGuard` so the whole group is
 * protected: unauthenticated users go to /login, authenticated users without
 * Operations access go to /dashboard, Ops users pass through. The per-page
 * `AppShell` renders the chrome; this layout only enforces access. The backend
 * API remains the source of truth for authorization.
 */
export default function OpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OpsRouteGuard>{children}</OpsRouteGuard>;
}
