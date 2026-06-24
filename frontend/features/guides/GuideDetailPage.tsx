"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button, Card, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { BlockRenderer } from "@/features/cms/BlockRenderer";
import { asString, headingSlug } from "@/features/cms/blockContent";
import type { CmsGuideDetail } from "@/lib/cms/api";

interface TocItem {
  id: string;
  label: string;
}

/** Builds the table of contents from rich-text section headings (T45). */
function buildToc(guide: CmsGuideDetail): TocItem[] {
  return guide.blocks
    .filter((block) => block.block_type === "rich_text")
    .map((block) => asString(block.content?.heading))
    .filter((heading) => heading.length > 0)
    .map((heading) => ({ id: headingSlug(heading), label: heading }));
}

/**
 * Public study-guide detail (T45). Body is CMS-rendered blocks; the table of
 * contents and related guides are derived from the guide payload. Generic for
 * any guide slug.
 */
export function GuideDetailPage({ guide }: { guide: CmsGuideDetail }) {
  const t = useTranslations("guides_detail");
  const toc = buildToc(guide);

  return (
    <div className="bg-background">
      {/* Title header (guides may or may not lead with a hero block) */}
      <section className="border-b border-border bg-gradient-to-b from-accent/40 to-background">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 lg:px-8">
          {guide.category && (
            <p className="text-sm font-medium uppercase tracking-wide text-primary">
              {guide.category}
            </p>
          )}
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {guide.title}
          </h1>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-[16rem_1fr] lg:gap-10">
          {/* Table of contents */}
          {toc.length > 0 && (
            <aside className="hidden lg:block">
              <nav
                aria-label={t("toc_title")}
                className="sticky top-24 py-12"
              >
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("toc_title")}
                </h2>
                <ul className="mt-4 space-y-2">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>
          )}

          {/* CMS-rendered guide body */}
          <article className="min-w-0">
            {guide.blocks.map((block, index) => (
              <BlockRenderer key={index} block={block} />
            ))}
          </article>
        </div>
      </div>

      {/* Related guides */}
      {guide.related.length > 0 && (
        <section className="border-t border-border bg-accent/30 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {t("related_title")}
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {guide.related.map((related) => (
                <Link
                  key={related.slug}
                  href={`/guides/${related.slug}`}
                  className="block h-full rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card className="h-full transition-colors hover:border-primary">
                    <CardHeader>
                      <CardTitle className="text-lg">{related.title}</CardTitle>
                      {related.meta_description && (
                        <CardDescription>
                          {related.meta_description}
                        </CardDescription>
                      )}
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Closing CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            {t("cta_title")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            {t("cta_subtitle")}
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href="/register">{t("cta_button")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
