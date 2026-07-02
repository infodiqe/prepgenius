import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/errors";
import {
  getExamTree,
  listExams,
  type ExamSummary,
  type ExamTree,
} from "../exams/examService";

/*
 * AI Draft Management — client data access (Sprint-6A-07).
 *
 * READ + two lifecycle actions (import / discard). Consumes ONLY the existing
 * ai_gateway endpoints; the backend is the source of truth and the RBAC gate.
 * No client-side filtering/search/sort/pagination (all server-side), no business
 * logic, no duplicate review workflow.
 *
 *   GET  /ai/jobs/                          → own generation jobs
 *   GET  /ai/jobs/{id}/                     → one job's progress
 *   GET  /ai/questions/drafts/              → paginated, filterable, searchable
 *   GET  /ai/questions/drafts/{id}/         → full draft (preview)
 *   POST /ai/questions/drafts/{id}/import/  → import into the Question pipeline
 *   POST /ai/questions/drafts/{id}/discard/ → discard a generated draft
 *   GET  /exams/  ·  GET /exams/{id}/tree/  → exam + subtopic pickers (reused)
 *
 * The ops endpoints are not in the generated OpenAPI client yet (regenerating it
 * is a backend/tooling step), so response shapes are typed locally.
 */

// ── Jobs (Section A / E) ─────────────────────────────────────────────────────

export type AiJobStatus = "pending" | "running" | "completed" | "failed";

export interface AiGenerationJob {
  id: string;
  status: AiJobStatus;
  progress: number;
  requested_count: number;
  generated_count: number;
  failed_count: number;
  provider: string;
  model: string;
  error_message: string;
  duration_seconds: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// ── Drafts (Sections B / C) ──────────────────────────────────────────────────

export type AiDraftStatus = "generated" | "imported" | "discarded";

export interface AiDraftListItem {
  id: string;
  status: AiDraftStatus;
  exam: string;
  subject: string;
  topic: string;
  question_type: string;
  difficulty: string;
  bloom_level: string;
  language: string;
  stem: string;
  provider: string;
  model: string;
  imported_question: string | null;
  created_by_email: string | null;
  created_at: string;
}

export interface AiDraftOption {
  label: string;
  text: string;
  is_correct: boolean;
}

export interface AiValidationIssue {
  code: string;
  severity: string;
  field: string;
  message: string;
}

export interface AiValidationReport {
  valid: boolean;
  errors: AiValidationIssue[];
  warnings: AiValidationIssue[];
}

export interface AiDraftDetail extends AiDraftListItem {
  subtopic: string | null;
  prompt_type: string;
  options: AiDraftOption[];
  correct_answer: string;
  explanation: string;
  learning_objective: string;
  estimated_time: number;
  tags: string[];
  confidence: number | null;
  generation_prompt: string;
  validation_report: AiValidationReport;
  imported_at: string | null;
  updated_at: string;
}

/** DRF LimitOffset envelope. */
export interface OffsetPage<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface DraftListParams {
  status?: string;
  exam?: string;
  subject?: string;
  difficulty?: string;
  language?: string;
  provider?: string;
  search?: string;
  ordering?: string;
  limit?: number;
  offset?: number;
}

export interface DraftImportBody {
  exam_id: string;
  subtopic_id: string;
}

export interface DraftImportResult {
  question_id: string;
  draft_id: string;
  review_status: string;
  origin: string;
  imported_at: string;
}

// ── Reads ────────────────────────────────────────────────────────────────────

export function listAiJobs(): Promise<AiGenerationJob[]> {
  return apiRequest<AiGenerationJob[]>("/ai/jobs/");
}

export function listAiDrafts(
  params: DraftListParams = {},
): Promise<OffsetPage<AiDraftListItem>> {
  const qs = new URLSearchParams();
  const keys: (keyof DraftListParams)[] = [
    "status",
    "exam",
    "subject",
    "difficulty",
    "language",
    "provider",
    "search",
    "ordering",
    "limit",
    "offset",
  ];
  for (const key of keys) {
    const value = params[key];
    if (value !== undefined && value !== null && value !== "") {
      qs.set(key, String(value));
    }
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiRequest<OffsetPage<AiDraftListItem>>(`/ai/questions/drafts/${suffix}`);
}

export function getAiDraft(id: string): Promise<AiDraftDetail> {
  return apiRequest<AiDraftDetail>(`/ai/questions/drafts/${id}/`);
}

// ── Actions ──────────────────────────────────────────────────────────────────

export function importAiDraft(
  id: string,
  body: DraftImportBody,
): Promise<DraftImportResult> {
  return apiRequest<DraftImportResult>(`/ai/questions/drafts/${id}/import/`, {
    method: "POST",
    body,
  });
}

export function discardAiDraft(id: string): Promise<AiDraftDetail> {
  return apiRequest<AiDraftDetail>(`/ai/questions/drafts/${id}/discard/`, {
    method: "POST",
  });
}

// Exam / subtopic pickers for the import dialog (reused endpoints).
export { getExamTree, listExams };
export type { ExamSummary, ExamTree };

// ── Pure helpers (presentation only) ─────────────────────────────────────────

export type LoadPhase = "loading" | "ready" | "empty" | "error" | "forbidden" | "unauthorized";

/** Map a fetch error onto an access/error phase (RBAC 401/403 surfaced). */
export function classifyPhase(
  err: unknown,
): Extract<LoadPhase, "error" | "forbidden" | "unauthorized"> {
  if (err instanceof ApiError && err.status === 403) return "forbidden";
  if (err instanceof ApiError && err.status === 401) return "unauthorized";
  return "error";
}

/** A job is "active" (contributes to auto-refresh) while pending or running. */
export function jobIsActive(job: AiGenerationJob): boolean {
  return job.status === "pending" || job.status === "running";
}

export function anyJobActive(jobs: readonly AiGenerationJob[]): boolean {
  return jobs.some(jobIsActive);
}

/** Questions still to process for a job (never negative). */
export function jobRemaining(job: AiGenerationJob): number {
  return Math.max(0, job.requested_count - job.generated_count - job.failed_count);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

/** Flatten an exam tree into selectable subtopics with a subject/topic path. */
export interface SubtopicChoice {
  id: string;
  label: string;
}

export function flattenSubtopics(tree: ExamTree | null): SubtopicChoice[] {
  if (!tree?.subjects) return [];
  const out: SubtopicChoice[] = [];
  for (const subject of tree.subjects) {
    for (const topic of subject.topics ?? []) {
      for (const sub of topic.subtopics ?? []) {
        out.push({ id: sub.id, label: `${subject.name} › ${topic.name} › ${sub.name}` });
      }
    }
  }
  return out;
}
