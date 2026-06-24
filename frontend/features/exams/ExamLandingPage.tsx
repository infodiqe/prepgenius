"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BookOpen, Check, GraduationCap } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Accordion,
  AccordionItem,
} from "@/components/ui";
import type { PublicExam } from "@/lib/exams/api";

const WHY_ITEMS = ["why_1", "why_2", "why_3"] as const;
const FAQ_ITEMS = ["q1", "q2", "q3", "q4"] as const;

/**
 * Public exam landing page (T42). Exam-specific data comes from the public exam
 * API; marketing copy (why-prepare, FAQ, labels) is i18n. Reusable for any
 * exam slug.
 */
export function ExamLandingPage({ exam }: { exam: PublicExam }) {
  const t = useTranslations("exam_landing");
  const { overview } = exam;

  const overviewRows = [
    { label: t("overview_eligibility"), value: exam.target_audience },
    { label: t("overview_mode"), value: overview.mode },
    {
      label: t("overview_duration"),
      value:
        overview.duration_minutes != null
          ? t("duration_value", { minutes: overview.duration_minutes })
          : "",
    },
    {
      label: t("overview_marks"),
      value: overview.total_marks != null ? String(overview.total_marks) : "",
    },
    {
      label: t("overview_questions"),
      value:
        overview.total_questions != null
          ? String(overview.total_questions)
          : "",
    },
    { label: t("exam_date_label"), value: exam.exam_date ?? "" },
  ].filter((row) => row.value);

  return (
    <div className="bg-background">
      {/* 1. Hero */}
      <section className="border-b border-border bg-gradient-to-b from-accent/40 to-background">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
          <Badge variant="secondary" className="mb-4">
            {exam.code}
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {exam.name}
          </h1>
          {exam.description && (
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              {exam.description}
            </p>
          )}
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href="/register">{t("hero_cta")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Exam overview */}
      {overviewRows.length > 0 && (
        <section className="py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-bold tracking-tight text-foreground">
              {t("overview_title")}
            </h2>
            <dl className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {overviewRows.map((row) => (
                <div
                  key={row.label}
                  className="rounded-lg border border-border bg-card p-5"
                >
                  <dt className="text-sm font-medium text-muted-foreground">
                    {row.label}
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-foreground">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      {/* 3. Syllabus preview */}
      <section className="border-t border-border bg-accent/30 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-foreground">
            {t("syllabus_title")}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
            {t("syllabus_subtitle")}
          </p>
          <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {exam.syllabus_summary.map((item) => (
              <li
                key={item.subject}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-5"
              >
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <BookOpen
                    aria-hidden="true"
                    className="h-4 w-4 text-primary"
                  />
                  {item.subject}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t("syllabus_topic_count", { count: item.topic_count })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4. Why prepare with PrepGenius */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-foreground">
            {t("why_title")}
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {WHY_ITEMS.map((item) => (
              <Card key={item} className="h-full">
                <CardHeader>
                  <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <GraduationCap aria-hidden="true" className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">{t(`${item}_title`)}</CardTitle>
                  <CardDescription>{t(`${item}_desc`)}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 5. FAQ */}
      <section className="border-t border-border bg-accent/30 py-16">
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

      {/* 6. Closing CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            {t("cta_title")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            {t("cta_subtitle")}
          </p>
          <div className="mt-8 flex items-center justify-center gap-2">
            <Check aria-hidden="true" className="h-4 w-4 text-primary" />
            <Button asChild size="lg">
              <Link href="/register">{t("cta_button")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
