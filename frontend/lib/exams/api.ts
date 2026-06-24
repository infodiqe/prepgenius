// Server-side fetch helpers for public exam landing pages (T42).

export interface PublicExamOverview {
  mode: string;
  duration_minutes: number | null;
  total_questions: number | null;
  total_marks: number | null;
  negative_marking: boolean | null;
}

export interface PublicExamSyllabusItem {
  subject: string;
  topic_count: number;
}

export interface PublicExam {
  slug: string;
  code: string;
  name: string;
  description: string;
  target_audience: string;
  exam_date: string | null;
  status: string;
  overview: PublicExamOverview;
  syllabus_summary: PublicExamSyllabusItem[];
}

export interface PublicExamListItem {
  slug: string;
  code: string;
  name: string;
  updated_at: string;
}

export interface SyllabusSubtopic {
  id: string;
  name: string;
  position: number;
}

export interface SyllabusTopic {
  id: string;
  name: string;
  position: number;
  subtopics: SyllabusSubtopic[];
}

export interface SyllabusSubject {
  id: string;
  name: string;
  position: number;
  topics: SyllabusTopic[];
}

export interface ExamSyllabus {
  exam: { slug: string; name: string };
  subjects: SyllabusSubject[];
}

export interface PreviousYearPaperItem {
  id: string;
  year: number;
  title: string;
  question_count: number;
  available: boolean;
}

export interface ExamPapers {
  exam: { slug: string; name: string };
  papers: PreviousYearPaperItem[];
}

const API_URL = process.env.API_URL ?? "http://django:8000";

/** Fetch a single published exam landing page by slug. Null on 404/error. */
export async function fetchPublicExam(slug: string): Promise<PublicExam | null> {
  try {
    const res = await fetch(
      `${API_URL}/api/v1/exams/public/${encodeURIComponent(slug)}/`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    return (await res.json()) as PublicExam;
  } catch {
    return null;
  }
}

/** Fetch the syllabus tree for a published exam by slug. Null on 404/error. */
export async function fetchExamSyllabus(
  slug: string,
): Promise<ExamSyllabus | null> {
  try {
    const res = await fetch(
      `${API_URL}/api/v1/exams/public/${encodeURIComponent(slug)}/syllabus/`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    return (await res.json()) as ExamSyllabus;
  } catch {
    return null;
  }
}

/** Fetch previous-year papers for a published exam by slug. Null on 404/error. */
export async function fetchExamPapers(slug: string): Promise<ExamPapers | null> {
  try {
    const res = await fetch(
      `${API_URL}/api/v1/exams/public/${encodeURIComponent(slug)}/previous-year-papers/`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    return (await res.json()) as ExamPapers;
  } catch {
    return null;
  }
}

/** Fetch all published exams with a slug (for the sitemap). [] on error. */
export async function fetchPublicExams(): Promise<PublicExamListItem[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/exams/public/`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return (await res.json()) as PublicExamListItem[];
  } catch {
    return [];
  }
}
