import { apiRequest } from "@/lib/api/client";

/*
 * Exam Management — client data access (OPS-05).
 *
 * Consumes ONLY existing exam endpoints; the backend is the source of truth.
 * READ-ONLY foundation — no create/update/delete, no reordering, no taxonomy
 * editing. No client-side business logic.
 *
 *   GET /exams/                → all exam configs (ExamReadSerializer[])
 *   GET /exams/{id}/tree/      → exam + nested subjects → topics → subtopics
 *   GET /papers/?exam_id=      → previous-year papers (optional exam scope)
 *
 * KNOWN BACKEND LIMITATIONS (documented gaps, surfaced as "Awaiting backend
 * support"): the exam list has no exam_type or status query parameter (active vs
 * inactive visibility is role-based, not a filter), so those filters are
 * disabled rather than emulated client-side.
 */

export interface ExamSummary {
  id: string;
  code: string;
  name: string;
  exam_type: string;
  audience_is_minor: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExamSubtopicNode {
  id: string;
  name: string;
  position: number;
}
export interface ExamTopicNode {
  id: string;
  name: string;
  position: number;
  subtopics?: ExamSubtopicNode[];
}
export interface ExamSubjectNode {
  id: string;
  name: string;
  position: number;
  topics?: ExamTopicNode[];
}
export interface ExamTree extends ExamSummary {
  subjects?: ExamSubjectNode[];
}

export interface PreviousYearPaper {
  id: string;
  exam_id: string;
  code: string;
  year: number;
  language: string;
  file_path: string | null;
  total_questions: number;
  created_at: string;
}

// ── Reads ──────────────────────────────────────────────────────────────────

export function listExams() {
  return apiRequest<ExamSummary[]>(`/exams/`);
}

export function getExamTree(examId: string) {
  return apiRequest<ExamTree>(`/exams/${examId}/tree/`);
}

export function listPapers(examId?: string) {
  const qs = examId ? `?exam_id=${encodeURIComponent(examId)}` : "";
  return apiRequest<PreviousYearPaper[]>(`/papers/${qs}`);
}

// ── Pure helpers (display-only, no business logic) ──────────────────────────

export interface ExamCounts {
  subjects: number;
  topics: number;
  subtopics: number;
}

export function examCounts(tree: ExamTree): ExamCounts {
  const subjects = tree.subjects ?? [];
  let topics = 0;
  let subtopics = 0;
  for (const subject of subjects) {
    const ts = subject.topics ?? [];
    topics += ts.length;
    for (const topic of ts) subtopics += (topic.subtopics ?? []).length;
  }
  return { subjects: subjects.length, topics, subtopics };
}

// ── Sections ────────────────────────────────────────────────────────────────

export type ExamSectionKey =
  | "exams"
  | "subjects"
  | "topics"
  | "subtopics"
  | "papers";

export interface ExamSectionDef {
  key: ExamSectionKey;
  title: string;
  kind: "exams" | "hierarchy" | "papers";
  /** Initial expand depth for hierarchy sections (1=subjects … 3=subtopics). */
  depth?: 1 | 2 | 3;
}

export const EXAM_SECTIONS: readonly ExamSectionDef[] = [
  { key: "exams", title: "Exams", kind: "exams" },
  { key: "subjects", title: "Subjects", kind: "hierarchy", depth: 1 },
  { key: "topics", title: "Topics", kind: "hierarchy", depth: 2 },
  { key: "subtopics", title: "Subtopics", kind: "hierarchy", depth: 3 },
  { key: "papers", title: "Previous Year Papers", kind: "papers" },
];
