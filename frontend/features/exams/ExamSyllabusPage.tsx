"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BookOpen } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  Badge,
  Button,
  EmptyState,
  EmptyStateTitle,
  EmptyStateDescription,
} from "@/components/ui";
import type { ExamSyllabus, SyllabusSubject } from "@/lib/exams/api";

function SubjectBody({ subject }: { subject: SyllabusSubject }) {
  return (
    <div className="space-y-5">
      {subject.topics.map((topic) => (
        <div key={topic.id}>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BookOpen aria-hidden="true" className="h-4 w-4 text-primary" />
            {topic.name}
          </h3>
          {topic.subtopics.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2 pl-6">
              {topic.subtopics.map((subtopic) => (
                <li key={subtopic.id}>
                  <span className="inline-flex rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
                    {subtopic.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Public exam syllabus page (T43). Renders the Exam → Subject → Topic →
 * Subtopic tree using the shared Accordion. Reusable for any exam slug.
 */
export function ExamSyllabusPage({ syllabus }: { syllabus: ExamSyllabus }) {
  const t = useTranslations("exam_syllabus");
  const { exam, subjects } = syllabus;

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

      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {subjects.length === 0 ? (
            <EmptyState>
              <EmptyStateTitle>{t("empty_title")}</EmptyStateTitle>
              <EmptyStateDescription>{t("empty_desc")}</EmptyStateDescription>
            </EmptyState>
          ) : (
            <>
              {/* 2. Subject navigation */}
              <nav aria-label={t("nav_title")}>
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {t("nav_title")}
                </h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {subjects.map((subject) => (
                    <li key={subject.id}>
                      <a
                        href={`#subject-${subject.id}`}
                        className="inline-flex rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                      >
                        {subject.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* 3-5. Expandable subjects → topics → subtopics */}
              <Accordion className="mt-8">
                {subjects.map((subject, index) => (
                  <AccordionItem
                    key={subject.id}
                    id={`subject-${subject.id}`}
                    question={subject.name}
                    answer={<SubjectBody subject={subject} />}
                    defaultOpen={index === 0}
                  />
                ))}
              </Accordion>
            </>
          )}
        </div>
      </section>

      {/* 6. CTA */}
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
