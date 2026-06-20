import { TrendDashboard } from "@/features/trends/TrendDashboard";

/*
 * Trends route — Sprint 4 · T27.
 *
 * Thin shell under the (student) group (RoleGuard + OnboardingGuard + AppShell
 * applied by the layout). The client TrendDashboard reads the existing T24 trend
 * endpoints and owns its loading/empty/error states.
 */
export default function TrendsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <TrendDashboard />
    </div>
  );
}
