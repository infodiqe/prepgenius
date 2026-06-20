import { TutorChatPanel } from "@/features/tutor/components/TutorChatPanel";

/*
 * AI Tutor route — Sprint 4 · T30A (frontend-only shell).
 *
 * Thin shell under the (student) group (RoleGuard + OnboardingGuard + AppShell
 * applied by the layout). Renders the TutorChatPanel coming-soon experience.
 * No backend wiring — Sprint 5 will integrate the AI Tutor via ai_gateway.
 */
export default function TutorPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <TutorChatPanel contextType="general" />
    </div>
  );
}
