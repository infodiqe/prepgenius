import * as React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/features/marketing/PublicHeader";
import { PublicFooter } from "@/features/marketing/PublicFooter";
import { ExamLandingPage } from "@/features/exams/ExamLandingPage";
import { fetchPublicExam } from "@/lib/exams/api";
import { pageMetadata } from "@/lib/seo/config";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const exam = await fetchPublicExam(slug);
  if (!exam) return {};
  return pageMetadata({
    title: exam.name,
    description: exam.description,
    path: `/exams/${slug}`,
  });
}

export default async function ExamPage({ params }: PageProps) {
  const { slug } = await params;
  const exam = await fetchPublicExam(slug);

  // Unknown / inactive / slug-less exam → 404.
  if (!exam) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">
        <ExamLandingPage exam={exam} />
      </main>
      <PublicFooter />
    </div>
  );
}
