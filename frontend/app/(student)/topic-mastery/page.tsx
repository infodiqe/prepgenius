import { TopicMasteryDashboard } from "@/features/topic-mastery/TopicMasteryDashboard";

/*
 * Topic Mastery route — Sprint 4 · T26.
 *
 * Thin shell under the (student) group (RoleGuard + OnboardingGuard + AppShell
 * applied by the layout). The client TopicMasteryDashboard reads the existing
 * T23 topic-performance endpoint and owns its loading/empty/error states.
 */
export default function TopicMasteryPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <TopicMasteryDashboard />
    </div>
  );
}
