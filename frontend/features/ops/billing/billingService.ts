import { apiRequest } from "@/lib/api/client";
import {
  listOpsUsers,
  userDisplayName,
  formatDate,
  type OpsUserListItem,
} from "../users/userService";

/*
 * Billing & Credits — client data access (OPS-07).
 *
 * READ-MOSTLY. Consumes ONLY the OPS-BE-02 credits endpoints plus the OPS-BE-01
 * user list (for lookup). The backend is the source of truth: no client-side
 * credit math, no mock data, no optimistic updates. The single mutation (admin
 * adjustment) is server-validated and the view reloads from the API afterwards.
 *
 *   GET  /ops/users/                 → user lookup (reused from OPS-06A)
 *   GET  /ops/users/{id}/credits/    → balance + last-20 ledger
 *   POST /ops/users/{id}/credits/adjust/ → signed admin adjustment
 */

/** Ledger transaction type (mirrors the backend CreditLedger choices). */
export type CreditTransactionType =
  | "grant"
  | "debit"
  | "reservation"
  | "release"
  | "adjustment";

/** One immutable ledger entry (money fields are exact decimal strings). */
export interface CreditLedgerEntry {
  id: string;
  transaction_type: CreditTransactionType;
  amount: string;
  balance_after: string;
  description: string;
  reference_id: string | null;
  created_by: string | null;
  created_at: string;
}

/** GET /ops/users/{id}/credits/ payload. */
export interface OpsUserCredits {
  balance: string;
  reserved: string;
  lifetime: string;
  recent_ledger: CreditLedgerEntry[];
}

/** POST /ops/users/{id}/credits/adjust/ response. */
export interface CreditAdjustResult {
  balance: { available: string; reserved: string; lifetime: string };
  entry: CreditLedgerEntry;
}

export interface CreditAdjustInput {
  /** Signed amount as typed (server validates non-zero / non-negative balance). */
  amount: string;
  description?: string;
}

// ── Reads ──────────────────────────────────────────────────────────────────

/** GET /ops/users/{id}/credits/ — balance + recent ledger for one user. */
export function getUserCredits(userId: string): Promise<OpsUserCredits> {
  return apiRequest<OpsUserCredits>(`/ops/users/${userId}/credits/`);
}

// ── Mutation (server-authoritative; no optimistic update) ────────────────────

/** POST /ops/users/{id}/credits/adjust/ — admin credit adjustment. */
export function adjustUserCredits(
  userId: string,
  input: CreditAdjustInput,
): Promise<CreditAdjustResult> {
  return apiRequest<CreditAdjustResult>(`/ops/users/${userId}/credits/adjust/`, {
    method: "POST",
    body: { amount: input.amount, description: input.description ?? "" },
  });
}

// ── Reused user-lookup surface (OPS-BE-01 server search) ─────────────────────
export { listOpsUsers, userDisplayName, formatDate };
export type { OpsUserListItem };
