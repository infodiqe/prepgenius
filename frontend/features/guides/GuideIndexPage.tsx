"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BookOpen } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
} from "@/components/ui";
import type { CmsGuideCard } from "@/lib/cms/api";

const UNCATEGORISED = "__uncategorised__";

/**
 * Public study-guide index (T45). Cards and their grouping come from the CMS
 * guide API; only the surrounding marketing copy is i18n. Generic for any set
 * of guides — nothing is exam-specific.
 */
export function GuideIndexPage({ guides }: { guides: CmsGuideCard[] }) {
  const t = useTranslations("guides_index");

  // Group cards by category, preserving the API's category-then-title order.
  const groups: { category: string; guides: CmsGuideCard[] }[] = [];
  const indexByCategory = new Map<string, number>();
  for (const guide of guides) {
    const key = guide.category || UNCATEGORISED;
    let idx = indexByCategory.get(key);
    if (idx === undefined) {
      idx = groups.length;
      indexByCategory.set(key, idx);
      groups.push({ category: guide.category, guides: [] });
    }
    groups[idx].guides.push(guide);
  }

  return (
    <div className="bg-background">
      {/* 1. Hero */}
      <section className="border-b border-border bg-gradient-to-b from-accent/40 to-background">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
          <Badge variant="secondary" className="mb-4">
            {t("hero_eyebrow")}
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {t("hero_title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            {t("hero_subtitle")}
          </p>
        </div>
      </section>

      {/* 2. Guide cards, grouped by category */}
      {guides.length === 0 ? (
        <section className="py-16">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {t("empty_title")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              {t("empty_desc")}
            </p>
          </div>
        </section>
      ) : (
        <section className="py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {groups.map((group, gi) => (
              <div key={group.category || gi} className="mt-12 first:mt-0">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  {group.category || t("category_general")}
                </h2>
                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {group.guides.map((guide) => (
                    <Link
                      key={guide.slug}
                      href={`/guides/${guide.slug}`}
                      className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                    >
                      <Card className="h-full transition-colors hover:border-primary">
                        <CardHeader>
                          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <BookOpen aria-hidden="true" className="h-6 w-6" />
                          </div>
                          <CardTitle className="text-xl">
                            {guide.title}
                          </CardTitle>
                          {guide.meta_description && (
                            <CardDescription>
                              {guide.meta_description}
                            </CardDescription>
                          )}
                        </CardHeader>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Closing CTA */}
      <section className="border-t border-border bg-accent/30 py-16">
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
