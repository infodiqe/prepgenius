import { AssessmentHistory } from "@/features/history/AssessmentHistory";

/*
 * Assessment History route — Sprint 4 · T21.
 *
 * Thin shell under the (student) group (RoleGuard + OnboardingGuard + AppShell
 * applied by the layout). The client AssessmentHistory reads existing analytics
 * endpoints and owns its loading/empty/error states.
 */
export default function HistoryPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <AssessmentHistory />
    </div>
  );
}
