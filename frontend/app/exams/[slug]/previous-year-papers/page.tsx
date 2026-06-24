import * as React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/features/marketing/PublicHeader";
import { PublicFooter } from "@/features/marketing/PublicFooter";
import { ExamPapersPage } from "@/features/exams/ExamPapersPage";
import { fetchExamPapers } from "@/lib/exams/api";
import { pageMetadata } from "@/lib/seo/config";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchExamPapers(slug);
  if (!data) return {};
  return pageMetadata({
    title: `${data.exam.name} Previous Year Papers`,
    description: `Practice previous year question papers for ${data.exam.name} — free with PrepGenius.`,
    path: `/exams/${slug}/previous-year-papers`,
  });
}

export default async function ExamPreviousYearPapers({ params }: PageProps) {
  const { slug } = await params;
  const data = await fetchExamPapers(slug);

  // Unknown / inactive exam → 404.
  if (!data) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">
        <ExamPapersPage data={data} />
      </main>
      <PublicFooter />
    </div>
  );
}
