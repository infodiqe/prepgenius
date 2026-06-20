"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

export interface SectionPageProps {
  /** Translation namespace, e.g. "public_pages.about". */
  namespace: string;
  /**
   * Section base keys. Each renders `${key}_title` + `${key}_body` from the
   * namespace. The namespace must also define `title` and `intro`.
   */
  sections: string[];
}

/**
 * Generic informational page: a heading, an intro, and a list of
 * heading + body sections (T37). Shared by About, Privacy, and Terms.
 */
export function SectionPage({ namespace, sections }: SectionPageProps) {
  const t = useTranslations(namespace);
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold tracking-tight text-foreground">
        {t("title")}
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">{t("intro")}</p>

      <div className="mt-12 space-y-10">
        {sections.map((key) => (
          <section key={key}>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {t(`${key}_title`)}
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              {t(`${key}_body`)}
            </p>
          </section>
        ))}
      </div>
    </article>
  );
}
