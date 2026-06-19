import { Suspense } from "react";
import VerifyEmailForm from "@/features/auth/VerifyEmailForm";

// Verify-email route — Sprint 1 · T07. Token-based, theme-aware shell that
// hosts the VerifyEmailForm. Form logic, validation, toasts (T01), and error
// handling (T02) live in the feature component; this page only provides the
// page-level layout. The Suspense boundary is required because the form reads
// search params (?email=) via useSearchParams.
export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <Suspense>
        <VerifyEmailForm />
      </Suspense>
    </div>
  );
}
