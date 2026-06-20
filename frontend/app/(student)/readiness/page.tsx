import { ReadinessDashboard } from "@/features/readiness/ReadinessDashboard";

/*
 * Readiness route — Sprint 4 · T20.
 *
 * Thin shell under the (student) group (RoleGuard + OnboardingGuard + AppShell
 * already applied by the layout). The client ReadinessDashboard reads existing
 * analytics endpoints and owns its loading/empty/error states.
 */
export default function ReadinessPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ReadinessDashboard />
    </div>
  );
}
