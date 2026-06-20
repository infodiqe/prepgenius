import { AttemptDeepDive } from "@/features/history/AttemptDeepDive";

/*
 * Per-attempt deep-dive route — Sprint 4 · T21, Section B.
 *
 * Thin shell; the client AttemptDeepDive reuses the existing /results/ and
 * /analytics/ endpoints and owns its loading/error states.
 */
interface PageProps {
  params: Promise<{ attemptId: string }>;
}

export default async function AttemptDeepDivePage({ params }: PageProps) {
  const { attemptId } = await params;
  return (
    <div className="container mx-auto px-4 py-8">
      <AttemptDeepDive attemptId={attemptId} />
    </div>
  );
}
