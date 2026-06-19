import type { Workspace } from "@/lib/workspace/cookies";

/**
 * Navigation configuration — Sprint 0 · S0-T03.
 *
 * Single source of truth for navigation items, keyed by `Workspace` (owned by
 * `lib/workspace/cookies`, S0-T01). The nav components (`Sidebar`,
 * `BottomTabBar`, refactored in S0-T09) read `navConfig[activeWorkspace]`
 * instead of holding hardcoded arrays. `activeWorkspace` is produced by
 * `resolveActiveWorkspace` (S0-T02); every workspace `deriveWorkspaces` can emit
 * has an entry here (enforced by the `Record<Workspace, …>` type + tests).
 *
 * Pure configuration data — no UI, no providers, no i18n calls here:
 * - `labelKey` is a key within the `nav` i18n namespace; the UI resolves it with
 *   `useTranslations("nav")` (matches the existing pattern).
 * - `icon` is a lucide icon *name* (string), mapped to a component in the UI
 *   layer (S0-T09). Keeping it a string decouples this config from the icon
 *   library and keeps the module node-testable.
 */

export interface NavItem {
  /** Key within the `nav` i18n namespace (e.g. "dashboard"). */
  labelKey: string;
  /** Route href. */
  href: string;
  /** lucide-react icon name; mapped to a component in the UI layer (S0-T09). */
  icon: string;
}

export interface WorkspaceNav {
  sidebar: NavItem[];
  /** Thumb-zone mobile tabs — capped at 5 per the UI/UX spec. */
  bottomTabs: NavItem[];
}

const PROFILE_ITEM: NavItem = {
  labelKey: "profile",
  href: "/profile",
  icon: "User",
};

// ── Student (universal base workspace) — parity with the current nav ──────────
const STUDENT_NAV: WorkspaceNav = {
  sidebar: [
    { labelKey: "dashboard", href: "/dashboard", icon: "Home" },
    { labelKey: "practice", href: "/practice", icon: "BookOpen" },
    { labelKey: "analytics", href: "/analytics", icon: "BarChart3" },
    { labelKey: "tutor", href: "/tutor", icon: "Bot" },
    PROFILE_ITEM,
  ],
  bottomTabs: [
    { labelKey: "home", href: "/dashboard", icon: "Home" },
    { labelKey: "practice", href: "/practice", icon: "BookOpen" },
    { labelKey: "analytics", href: "/analytics", icon: "BarChart3" },
    { labelKey: "tutor", href: "/tutor", icon: "Bot" },
    PROFILE_ITEM,
  ],
};

// ── Review (stub — full screens land in S2; hrefs point to the (review) group) ─
const REVIEW_SIDEBAR: NavItem[] = [
  { labelKey: "queue", href: "/review/queue", icon: "ClipboardCheck" },
  { labelKey: "sme_queue", href: "/review/sme", icon: "ShieldCheck" },
  { labelKey: "publish", href: "/review/publish", icon: "Send" },
  PROFILE_ITEM,
];
const REVIEW_NAV: WorkspaceNav = {
  sidebar: REVIEW_SIDEBAR,
  bottomTabs: REVIEW_SIDEBAR,
};

// ── Admin (stub — full screens land in S4; hrefs point to the (admin) group) ──
const ADMIN_SIDEBAR: NavItem[] = [
  { labelKey: "control_center", href: "/admin", icon: "LayoutDashboard" },
  { labelKey: "content", href: "/admin/content", icon: "FileText" },
  { labelKey: "users", href: "/admin/users", icon: "Users" },
  PROFILE_ITEM,
];
const ADMIN_NAV: WorkspaceNav = {
  sidebar: ADMIN_SIDEBAR,
  bottomTabs: ADMIN_SIDEBAR,
};

/** Navigation per workspace. Keys are exhaustive over the `Workspace` union. */
export const navConfig: Record<Workspace, WorkspaceNav> = {
  student: STUDENT_NAV,
  review: REVIEW_NAV,
  admin: ADMIN_NAV,
};
