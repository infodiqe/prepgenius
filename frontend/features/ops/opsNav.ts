/**
 * Operations Platform navigation config — OPS-01A (shell foundation).
 *
 * Single source of truth for the Ops Platform sidebar. The `Sidebar` and
 * `MobileNav` components render `visibleOpsNavForPersonas(personas)` — they never
 * hardcode items or role checks in JSX (config-driven navigation).
 *
 * **Personas are presentation-only.** They group navigation for the UI and never
 * grant authorization. Real access control is enforced server-side by the API
 * (RBAC + tenant isolation, see docs/ui-ux/ops_platform_ux_architecture.md §15).
 * Persona visibility here mirrors the §15 matrix and the OPS-HARDEN-02 examples
 * (Reviewer → Review only, SME → Review + SME Review, Support → Overview + Users,
 * Super Admin → everything). The user's real personas are derived from their RBAC
 * roles by `deriveOpsPersonas` (`opsAccess.ts`) — there is no hardcoded default.
 *
 * The Operations Platform is **English-only** (architecture decision: ops UI is
 * English; only the educational *content* under review is multilingual). Labels
 * are therefore plain English constants — there is no i18n namespace here.
 *
 * Pure configuration data — no UI, no providers:
 * - `label` is the English display string rendered verbatim by the UI.
 * - `icon` is a lucide icon *name* (string), mapped to a component in `opsIcons.ts`.
 *   Keeping it a string decouples this config from the icon library and keeps the
 *   module node-testable.
 */

/** Ops personas from the UX architecture §1 (UI grouping only — not authz). */
export const OPS_PERSONAS = {
  SUPER_ADMIN: "super_admin",
  CONTENT_MANAGER: "content_manager",
  REVIEWER: "reviewer",
  SME: "sme",
  OPS_MANAGER: "ops_manager",
  SUPPORT: "support",
  INSTITUTE_ADMIN: "institute_admin",
} as const;

export type OpsPersona = (typeof OPS_PERSONAS)[keyof typeof OPS_PERSONAS];

export const ALL_OPS_PERSONAS: readonly OpsPersona[] =
  Object.values(OPS_PERSONAS);

export interface OpsNavItem {
  /** Stable id (used as React key and in tests). */
  id: string;
  /** English display label (ops UI is English-only). */
  label: string;
  /** Route href. */
  href: string;
  /** lucide-react icon name; mapped to a component in `opsIcons.ts`. */
  icon: string;
  /** Personas that may see this workspace (UI grouping only). */
  personas: readonly OpsPersona[];
  /**
   * When true, the workspace route is not built yet (OPS-HARDEN-02 Part C). The
   * nav renders it as a disabled "Coming Soon" destination — visible in the IA,
   * but not a link, so it never 404s.
   */
  comingSoon?: boolean;
}

const {
  SUPER_ADMIN,
  CONTENT_MANAGER,
  REVIEWER,
  SME,
  OPS_MANAGER,
  SUPPORT,
  INSTITUTE_ADMIN,
} = OPS_PERSONAS;

/**
 * Ordered Ops Platform workspaces. Persona visibility mirrors the RBAC matrix in
 * the UX architecture §15 (any-access; capability nuance is enforced server-side).
 */
export const opsNavItems: readonly OpsNavItem[] = [
  {
    id: "overview",
    label: "Overview",
    href: "/ops",
    icon: "LayoutDashboard",
    personas: [
      SUPER_ADMIN,
      CONTENT_MANAGER,
      OPS_MANAGER,
      SUPPORT,
      INSTITUTE_ADMIN,
    ],
  },
  {
    id: "content-studio",
    label: "Content Studio",
    href: "/ops/content",
    icon: "FileText",
    personas: [SUPER_ADMIN, CONTENT_MANAGER, OPS_MANAGER],
  },
  {
    id: "review-queue",
    label: "Review Queue",
    href: "/ops/review",
    icon: "ClipboardCheck",
    personas: [SUPER_ADMIN, CONTENT_MANAGER, REVIEWER, SME, OPS_MANAGER],
  },
  {
    id: "sme-review",
    label: "SME Review",
    href: "/ops/sme",
    icon: "ShieldCheck",
    personas: [SUPER_ADMIN, SME, OPS_MANAGER],
    comingSoon: true,
  },
  {
    id: "exams",
    label: "Exams",
    href: "/ops/exams",
    icon: "GraduationCap",
    personas: [SUPER_ADMIN, CONTENT_MANAGER, OPS_MANAGER],
  },
  {
    id: "cms-studio",
    label: "CMS Studio",
    href: "/ops/cms",
    icon: "Globe",
    personas: [SUPER_ADMIN, CONTENT_MANAGER, INSTITUTE_ADMIN],
  },
  {
    id: "analytics",
    label: "Analytics",
    href: "/ops/analytics",
    icon: "BarChart3",
    personas: [SUPER_ADMIN, CONTENT_MANAGER, OPS_MANAGER, INSTITUTE_ADMIN],
  },
  {
    id: "ai-operations",
    label: "AI Operations",
    href: "/ops/ai",
    icon: "Sparkles",
    personas: [SUPER_ADMIN, CONTENT_MANAGER],
  },
  {
    id: "billing",
    label: "Billing",
    href: "/ops/billing",
    icon: "CreditCard",
    personas: [SUPER_ADMIN, OPS_MANAGER, INSTITUTE_ADMIN],
  },
  {
    id: "settings",
    label: "Settings",
    href: "/ops/settings",
    icon: "Settings",
    personas: [SUPER_ADMIN, OPS_MANAGER, INSTITUTE_ADMIN],
    comingSoon: true,
  },
  {
    id: "users",
    label: "Users",
    href: "/ops/users",
    icon: "Users",
    personas: [SUPER_ADMIN, OPS_MANAGER, SUPPORT, INSTITUTE_ADMIN],
  },
];

/**
 * Pure: the navigation items visible to a set of personas (the union of what
 * each persona may see), in declared order. A user with multiple RBAC roles
 * therefore sees the union of their personas' workspaces. Returns a new array
 * (never mutates `opsNavItems`).
 */
export function visibleOpsNavForPersonas(
  personas: readonly OpsPersona[],
): OpsNavItem[] {
  const set = new Set(personas);
  return opsNavItems.filter((item) =>
    item.personas.some((p) => set.has(p)),
  );
}

/**
 * Pure: the navigation items a single persona may see, in declared order.
 * Thin wrapper over {@link visibleOpsNavForPersonas} for single-persona callers
 * (and tests).
 */
export function visibleOpsNav(persona: OpsPersona): OpsNavItem[] {
  return visibleOpsNavForPersonas([persona]);
}
