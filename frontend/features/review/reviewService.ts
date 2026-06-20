import { apiRequest } from "@/lib/api/client";
import type { paths } from "@/lib/api/types";

/*
 * Review Board — client data access (T31).
 *
 * Consumes ONLY existing content-review / questions / exams endpoints; the
 * backend is the source of truth and enforces the state machine + RBAC. This
 * module performs NO business logic — it fetches, shapes for display, and POSTs
 * workflow actions whose legality the server validates.
 *
 *   GET  /questions/?review_status=        → review queue (Section A)
 *   GET  /questions/{id}/                  → question detail incl. options (B)
 *   GET  /questions/{id}/reviews/          → audit history → claim indicator (C)
 *   GET  /exams/{id}/tree/                 → subtopic → subject/topic names
 *   POST /questions/{id}/claim|release-claim|approve|sme-approve|request-sme|reject
 *
 * KNOWN BACKEND LIMITATION (see T31 risks): the question read serializer does
 * not expose `claimed_by`, and `release-claim` is not written to the audit log.
 * The claim indicator is therefore DERIVED (best-effort) from the latest logged
 * `claim` event and may be stale after a release. All mutations remain
 * server-authoritative, so a stale indicator never lets an unauthorized action
 * succeed — the API rejects it.
 */

export type QuestionListItem =
  paths["/api/v1/questions/"]["get"]["responses"]["200"]["content"]["application/json"][number];
export type QuestionDetail =
  paths["/api/v1/questions/{id}/"]["get"]["responses"]["200"]["content"]["application/json"];
export type ContentReview =
  paths["/api/v1/questions/{question_pk}/reviews/"]["get"]["responses"]["200"]["content"]["application/json"][number];

export type ReviewStatus =
  | "draft"
  | "in_review"
  | "sme_review"
  | "approved"
  | "published"
  | "rejected";

// Exam tree (subtopic → subject/topic names). Typed locally: the generated
// client types the nested hierarchy loosely, and we only read id/name here.
interface SubtopicNode {
  id: string;
  name: string;
}
interface TopicNode {
  id: string;
  name: string;
  subtopics?: SubtopicNode[];
}
interface SubjectNode {
  id: string;
  name: string;
  topics?: TopicNode[];
}
interface ExamTreeResponse {
  id: string;
  subjects?: SubjectNode[];
}

/** Resolved subject/topic names for a subtopic, for display in queue/detail. */
export interface SubtopicLabel {
  subject: string;
  topic: string;
}

/** Best-effort claim indicator derived from the audit history (see note above). */
export interface ClaimState {
  isClaimed: boolean;
  claimedById: string | null;
  claimedByName: string | null;
  isMine: boolean;
}

// ── Reads ────────────────────────────────────────────────────────────────

/** Questions in the review pipeline. Optionally narrowed to one status. */
export function listReviewQuestions(reviewStatus?: ReviewStatus) {
  const qs = reviewStatus
    ? `?review_status=${encodeURIComponent(reviewStatus)}`
    : "";
  return apiRequest<QuestionListItem[]>(`/questions/${qs}`);
}

export function getReviewQuestion(id: string) {
  return apiRequest<QuestionDetail>(`/questions/${id}/`);
}

export function getQuestionReviews(id: string) {
  return apiRequest<ContentReview[]>(`/questions/${id}/reviews/`);
}

export function getExamTree(examId: string) {
  return apiRequest<ExamTreeResponse>(`/exams/${examId}/tree/`);
}

// ── Workflow actions (server-authoritative) ──────────────────────────────

export function claimQuestion(id: string) {
  return apiRequest<void>(`/questions/${id}/claim/`, {
    method: "POST",
    body: { question_id: id },
  });
}

export function releaseQuestion(id: string) {
  return apiRequest<void>(`/questions/${id}/release-claim/`, {
    method: "POST",
    body: { question_id: id },
  });
}

export function rejectQuestion(id: string, comment: string) {
  return apiRequest<void>(`/questions/${id}/reject/`, {
    method: "POST",
    body: { comment },
  });
}

/** Escalate to SME review (in_review → sme_review). */
export function escalateQuestion(id: string, comment: string) {
  return apiRequest<void>(`/questions/${id}/request-sme/`, {
    method: "POST",
    body: { comment },
  });
}

/**
 * Approve at the level the question's current status calls for: a question in
 * `sme_review` is approved through the SME endpoint, otherwise the reviewer
 * endpoint. This only routes to the correct existing endpoint — authority and
 * transition legality are enforced by the backend (a reviewer hitting the SME
 * endpoint is rejected with 403).
 */
export function approveQuestion(
  id: string,
  status: ReviewStatus,
  comment: string,
) {
  const path =
    status === "sme_review"
      ? `/questions/${id}/sme-approve/`
      : `/questions/${id}/approve/`;
  return apiRequest<void>(path, { method: "POST", body: { comment } });
}

// ── Display helpers (pure, no business logic) ────────────────────────────

/**
 * Derive the claim indicator from audit history. The latest logged `claim`
 * action denotes the current claimant (see module note re: limitations).
 */
export function deriveClaimState(
  reviews: ContentReview[],
  currentUserId: string | null,
): ClaimState {
  const latestClaim = [...reviews]
    .filter((r) => r.action === "claim")
    .sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime(),
    )[0];

  const claimedById = latestClaim?.actor ?? null;
  const claimedByName = latestClaim?.actor_name ?? null;
  return {
    isClaimed: Boolean(claimedById),
    claimedById,
    claimedByName,
    isMine: Boolean(claimedById) && claimedById === currentUserId,
  };
}

/** Build a subtopicId → {subject, topic} lookup from one or more exam trees. */
export function buildSubtopicIndex(
  trees: ExamTreeResponse[],
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
