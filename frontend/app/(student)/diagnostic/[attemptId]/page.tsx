import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/serverAuth";
import { DiagnosticCompletion } from "@/features/diagnostic/DiagnosticCompletion";

/*
 * Diagnostic completion route — Sprint 1 · T13.5.
 *
 * Thin server shell: authenticates, then hands off to the client
 * DiagnosticCompletion, which reads the scored attempt via the existing
 * GET /attempts/{id}/ endpoint and renders the scored / pending / error states.
 * No scoring, results-page, or backend changes.
 */
interface PageProps {
  params: Promise<{ attemptId: string }>;
}

export default async function DiagnosticCompletePage({ params }: PageProps) {
  const { attemptId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=/diagnostic/${attemptId}`);
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-8">
      <DiagnosticCompletion attemptId={attemptId} />
    </div>
  );
}
