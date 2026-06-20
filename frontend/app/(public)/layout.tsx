import type { ReactNode } from "react";
import { PublicHeader } from "@/features/marketing/PublicHeader";
import { PublicFooter } from "@/features/marketing/PublicFooter";

// Shared chrome for the public informational pages (T37). The homepage renders
// its own header/footer via LandingPage and is intentionally not in this group.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
