import * as React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/features/marketing/PublicHeader";
import { PublicFooter } from "@/features/marketing/PublicFooter";
import { ExamSyllabusPage } from "@/features/exams/ExamSyllabusPage";
import { fetchExamSyllabus } from "@/lib/exams/api";
import { pageMetadata } from "@/lib/seo/config";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const syllabus = await fetchExamSyllabus(slug);
  if (!syllabus) return {};
  return pageMetadata({
    title: `${syllabus.exam.name} Syllabus`,
    description: `Complete syllabus for ${syllabus.exam.name} — all subjects, topics, and subtopics.`,
    path: `/exams/${slug}/syllabus`,
  });
}

export default async function ExamSyllabus({ params }: PageProps) {
  const { slug } = await params;
  const syllabus = await fetchExamSyllabus(slug);

  // Unknown / inactive exam → 404.
  if (!syllabus) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">
        <ExamSyllabusPage syllabus={syllabus} />
      </main>
      <PublicFooter />
    </div>
  );
}
