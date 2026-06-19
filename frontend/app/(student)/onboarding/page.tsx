import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Compass } from "lucide-react";

import {
  Skeleton,
  SkeletonText,
  EmptyState,
  EmptyStateIcon,
  EmptyStateTitle,
  EmptyStateDescription,
} from "@/components/ui";
import { getCurrentUser } from "@/features/auth/serverAuth";
import { getExamsListServer } from "@/features/practice/practiceService";
import OnboardingWizard from "@/features/onboarding/OnboardingWizard";

/*
 * Onboarding route — Sprint 1 · T09. This is the T08 redirect target: students
 * with no target exam land here to complete their profile. The page is a thin
 * server shell that loads the active exam list + current profile, then hands
 * off to the client OnboardingWizard. Auth + onboarding gating already happen in
 * (student)/layout.tsx (RoleGuard → OnboardingGuard, which exempts this path).
 */

function WizardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <div className="space-y-6 rounded-lg border bg-card p-6 shadow-sm">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-1/2" />
        <SkeletonText lines={2} />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

async function OnboardingContent() {
  const t = await getTranslations("onboarding");
  const [user, exams] = await Promise.all([
    getCurrentUser(),
    getExamsListServer(),
  ]);

  const activeExams = (exams ?? [])
    .filter((exam) => exam.is_active)
    .map((exam) => ({ id: exam.id, name: exam.name, code: exam.code }));

  if (activeExams.length === 0) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-lg items-center justify-center px-4 py-8">
        <EmptyState>
          <EmptyStateIcon>
            <Compass />
          </EmptyStateIcon>
          <EmptyStateTitle>{t("no_exams_title")}</EmptyStateTitle>
          <EmptyStateDescription>{t("no_exams_desc")}</EmptyStateDescription>
        </EmptyState>
      </div>
    );
  }

  return (
    <OnboardingWizard
      exams={activeExams}
      initialExamId={user?.target_exam_id ?? ""}
      initialExamDate={user?.exam_date ?? ""}
    />
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<WizardSkeleton />}>
      <OnboardingContent />
    </Suspense>
  );
}
