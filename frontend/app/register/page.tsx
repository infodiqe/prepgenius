import RegistrationForm from "@/features/auth/RegistrationForm";

// Registration route — Sprint 1 · T05a. Token-based, theme-aware shell that
// hosts the RegistrationForm. Form logic, validation, and submit handling live
// in the feature component; this page only provides the page-level layout.
export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <RegistrationForm />
    </div>
  );
}
