"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FileText, Target, Timer, Search } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  EmptyState,
  EmptyStateTitle,
  EmptyStateDescription,
} from "@/components/ui";
import type { ExamPapers } from "@/lib/exams/api";

const BENEFITS = [
  { key: "benefit_1", Icon: Target },
  { key: "benefit_2", Icon: Timer },
  { key: "benefit_3", Icon: Search },
] as const;

const FAQ_ITEMS = ["q1", "q2", "q3", "q4"] as const;

/**
 * Public previous-year-papers page (T44). Lists past papers for an exam with
 * marketing context. Reusable for any exam slug.
 */
export function ExamPapersPage({ data }: { data: ExamPapers }) {
  const t = useTranslations("exam_papers");
  const { exam, papers } = data;

  return (
    <div className="bg-background">
      {/* 1. Hero */}
      <section className="border-b border-border bg-gradient-to-b from-accent/40 to-background">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
          <Badge variant="secondary" className="mb-4">
            {t("hero_eyebrow")}
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {exam.name}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            {t("hero_subtitle")}
          </p>
        </div>
      </section>

      {/* 2. Papers list */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-foreground">
            {t("papers_title")}
          </h2>
          {papers.length === 0 ? (
            <EmptyState className="mt-10">
              <EmptyStateTitle>{t("empty_title")}</EmptyStateTitle>
              <EmptyStateDescription>{t("empty_desc")}</EmptyStateDescription>
            </EmptyState>
          ) : (
            <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {papers.map((paper) => (
                <li key={paper.id}>
                  <div className="flex h-full flex-col rounded-lg border border-border bg-card p-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-semibold text-foreground">
                        <FileText
                          aria-hidden="true"
                          className="h-4 w-4 text-primary"
                        />
                        {paper.title}
                      </span>
                      <Badge variant={paper.available ? "default" : "secondary"}>
                        {paper.available ? t("available") : t("unavailable")}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("year_label", { year: paper.year })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("questions_label", { count: paper.question_count })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 3. Benefits of solving PYQs */}
      <section className="border-t border-border bg-accent/30 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-foreground">
            {t("benefits_title")}
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {BENEFITS.map(({ key, Icon }) => (
              <Card key={key} className="h-full">
                <CardHeader>
                  <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon aria-hidden="true" className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">{t(`${key}_title`)}</CardTitle>
                  <CardDescription>{t(`${key}_desc`)}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 4. FAQ */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-foreground">
            {t("faq_title")}
          </h2>
          <Accordion className="mt-10">
            {FAQ_ITEMS.map((item) => (
              <AccordionItem
                key={item}
                question={t(`faq_${item}_q`)}
                answer={t(`faq_${item}_a`)}
              />
            ))}
          </Accordion>
        </div>
      </section>

      {/* 5. CTA */}
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
