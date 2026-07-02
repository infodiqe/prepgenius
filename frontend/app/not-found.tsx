import React from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui";

/*
 * Global 404 boundary (SPRINT-5B-01).
 *
 * Renders inside the root layout (NextIntlClientProvider is available), so copy
 * is localized via the shared `errors` namespace. Dynamic pages that call
 * notFound() (e.g. /content/[slug], /exams/[slug]) now resolve to this branded
 * page instead of the unstyled Next.js default.
 */
export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-6xl font-extrabold tracking-tight text-muted-foreground">404</p>
      <h1 className="text-2xl font-bold text-foreground">{t("notFound")}</h1>
      <Button asChild>
        <Link href="/">{t("go_home")}</Link>
      </Button>
    </main>
  );
}
