import { cookies } from "next/headers";

/*
 * Student credit visibility — server-side data access (SPRINT-5A-04/05).
 *
 * READ-ONLY. Consumes ONLY the authenticated learner credit endpoints. The
 * backend is the single source of truth: no client-side credit math, no mock
 * data, no optimistic updates. A learner only ever reads their own balance and
 * ledger (the endpoints scope to request.user server-side).
 *
 *   GET /api/v1/credits/balance/  → { available, reserved, lifetime }
 *   GET /api/v1/credits/ledger/   → cursor page of immutable ledger entries
 *
 * Money fields are exact decimal strings from the server — never parsed into
 * floats or recomputed here (PRD v4 §5.2 / §20.2; CLAUDE.md credit rules).
 */

const API_URL = process.env.API_URL ?? "http://django:8000";

/** `{ available, reserved, lifetime }` — exact decimal strings. */
export interface CreditSummary {
  available: string;
  reserved: string;
  lifetime: string;
}

/** Ledger transaction type (mirrors the backend CreditLedger choices). */
export type CreditTransactionType =
  | "grant"
  | "debit"
  | "reservation"
  | "release"
  | "adjustment";

/**
 * One immutable, learner-visible ledger entry. `created_by` (the ops admin who
 * recorded an adjustment) is intentionally NOT surfaced to learners.
 */
export interface CreditLedgerEntry {
  id: string;
  transaction_type: CreditTransactionType;
  amount: string;
  balance_after: string;
  description: string;
  reference_id: string | null;
  created_at: string;
}

/** Cursor-paginated ledger page (DRF CursorPagination shape). */
export interface CreditLedgerPage {
  next: string | null;
  previous: string | null;
  results: CreditLedgerEntry[];
}

async function getHeaders() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;

  return {
    "Content-Type": "application/json",
    Cookie: `access_token=${accessToken || ""}; refresh_token=${refreshToken || ""}`,
  };
}

/** GET /credits/balance/ — the learner's own balance, or null on failure. */
export async function getCreditBalanceServer(): Promise<CreditSummary | null> {
  try {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}/api/v1/credits/balance/`, {
      method: "GET",
      headers,
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Error fetching credit balance:", error);
    return null;
  }
}

/** GET /credits/ledger/ — the learner's most recent ledger page, or null. */
export async function getCreditLedgerServer(): Promise<CreditLedgerPage | null> {
  try {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}/api/v1/credits/ledger/`, {
      method: "GET",
      headers,
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Error fetching credit ledger:", error);
    return null;
  }
}
