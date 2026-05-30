# ADR-002: Ai Strategy

- **Status:** Accepted
- **Date:** 30 May 2026

## Context
AI (tutor, generation, explanations) is the main variable cost and a trust risk if content is wrong. We need provider independence and strict margin control.

## Decision
All AI behind a single `ai_gateway` with a configurable fallback chain **Groq → OpenAI → DeepSeek**. Every call is metered by an **append-only credit ledger** (reserve→commit/release) enforced server-side; responses cached. **AI-generated content is always Draft** and requires human review before publish.

## Consequences
Margins protected and providers swappable via config; content trust preserved via the review gate. Tradeoff: added ledger/review machinery, justified by cost and trust risk.
