import {
  BarChart3,
  Circle,
  ClipboardCheck,
  CreditCard,
  FileText,
  Globe,
  GraduationCap,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Ops nav icon registry — OPS-01A.
 *
 * Maps the `icon` *names* declared in `opsNav.ts` (strings, to keep the config
 * decoupled from the icon library and node-testable) to their lucide components.
 */
export const OPS_NAV_ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  ShieldCheck,
  GraduationCap,
  Globe,
  BarChart3,
  Sparkles,
  CreditCard,
  Settings,
  Users,
};

/** Resolve a lucide icon by name; falls back to a neutral icon if unknown. */
export function getOpsNavIcon(name: string): LucideIcon {
  return OPS_NAV_ICONS[name] ?? Circle;
}
