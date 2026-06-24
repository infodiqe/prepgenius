import { apiRequest } from "@/lib/api/client";
import type { paths } from "@/lib/api/types";

/*
 * Content Studio — client data access (OPS-02).
 *
 * Consumes ONLY existing questions / exams endpoints; the backend is the source
 * of truth. This module performs NO business logic, NO client-side filtering,
 * search, or pagination — it fetches and shapes IDs into display labels.
 *
 *   GET /questions/?exam_id=&review_status=  → question list (Section A)
 *   GET /exams/                              → exam id→name + taxonomy roots
 *   GET /exams/{id}/tree/                    → subtopic → subject/topic names
 *
 * STRICT API-ONLY SCOPE (OPS-02 decision): the list endpoint supports only
 * `exam_id` and `review_status` server filters and returns an UNPAGINATED list.
 * It exposes no text/ID search, no subject/topic filter, and no pagination. Those
 * controls are rendered DISABLED ("Awaiting backend support") in the UI rather
 * than emulated client-side. The question read serializer also has no author
 * field, so the detail drawer omits "Created By".
 */

// The list item already carries options + explanation (content-role payload), so
// the detail drawer reuses it with no extra round-trip.
export type ContentQuestion =
  paths["/api/v1/questions/"]["get"]["responses"]["200"]["content"]["application/json"][number];
export type ContentQuestionOption = ContentQuestion["options"][number];

/** Review-state union (mirrors the backend Question.review_status choices). */
export type ContentReviewStatus =
  | "draft"
  | "in_review"
  | "sme_review"
  | "approved"
  | "published"
  | "rejected";

/** Exam list item — read subset used for the id→name map and taxonomy roots. */
export interface ContentExam {
  id: string;
  code: string;
  name: string;
}

// Exam tree (subtopic → subject/topic names). Typed locally to the fields we
// read; the generated client types the nested hierarchy loosely.
export interface ContentSubtopicNode {
  id: string;
  name: string;
  position: number;
}
export interface ContentTopicNode {
  id: string;
  name: string;
  position: number;
  subtopics?: ContentSubtopicNode[];
}
export interface ContentSubjectNode {
  id: string;
  name: string;
  position: number;
  topics?: ContentTopicNode[];
}
export interface ContentExamTree {
  id: string;
  code: string;
  name: string;
  subjects?: ContentSubjectNode[];
}

/** Resolved subject/topic names for a subtopic, for display in the table/drawer. */
export interface SubtopicLabel {
  subject: string;
  topic: string;
}

export interface ListQuestionsParams {
  examId?: string;
  reviewStatus?: ContentReviewStatus;
}

// ── Reads (server-filtered only) ──────────────────────────────────────────

/**
 * List questions, optionally narrowed by the two server-supported filters.
 * No client-side filtering happens here or downstream.
 */
export function listQuestions(params: ListQuestionsParams = {}) {
  const qs = new URLSearchParams();
  if (params.examId) qs.set("exam_id", params.examId);
  if (params.reviewStatus) qs.set("review_status", params.reviewStatus);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiRequest<ContentQuestion[]>(`/questions/${suffix}`);
}

export function listExams() {
  return apiRequest<ContentExam[]>(`/exams/`);
}

export function getExamTree(examId: string) {
  return apiRequest<ContentExamTree>(`/exams/${examId}/tree/`);
}

// ── Display helpers (pure — no business logic, no filtering) ───────────────

/** Build an examId → name lookup for resolving the table's Exam column. */
export function buildExamNameIndex(
  exams: ContentExam[],
): Record<string, string> {
  const index: Record<string, string> = {};
  for (const exam of exams) index[exam.id] = exam.name;
  return index;
}

/** Build a subtopicId → {subject, topic} lookup from one or more exam trees. */
export function buildSubtopicIndex(
  trees: ContentExamTree[],
): Record<string, SubtopicLabel> {
  const index: Record<string, SubtopicLabel> = {};
  for (const tree of trees) {
    for (const subject of tree.subjects ?? []) {
      for (const topic of subject.topics ?? []) {
        for (const sub of topic.subtopics ?? []) {
          index[sub.id] = { subject: subject.name, topic: topic.name };
        }
      }
    }
  }
  return index;
}

/** Single correct option label for a question, or null if none/unknown. */
export function correctOptionLabel(question: ContentQuestion): string | null {
  const correct = (question.options ?? []).find((o) => o.is_correct);
  return correct ? correct.label : null;
}
