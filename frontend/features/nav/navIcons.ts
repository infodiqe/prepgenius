import {
  BarChart3,
  BookOpen,
  Bot,
  Circle,
  ClipboardCheck,
  FileText,
  Home,
  LayoutDashboard,
  Send,
  ShieldCheck,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Nav icon registry — Sprint 0 · S0-T09.
 *
 * Maps the `icon` *names* declared in `navConfig` (S0-T03 stores icons as strings
 * to keep the config decoupled from the icon library) to their lucide
 * components. This is the UI-layer mapping the config deferred to this ticket.
 */
export const NAV_ICONS: Record<string, LucideIcon> = {
  Home,
  BookOpen,
  BarChart3,
  Bot,
  User,
  ClipboardCheck,
  ShieldCheck,
  Send,
  LayoutDashboard,
  FileText,
  Users,
};

/** Resolve a lucide icon by name; falls back to a neutral icon if unknown. */
export function getNavIcon(name: string): LucideIcon {
  return NAV_ICONS[name] ?? Circle;
}
