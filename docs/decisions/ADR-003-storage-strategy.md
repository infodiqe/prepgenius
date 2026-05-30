# ADR-003: Storage Strategy

- **Status:** Accepted
- **Date:** 30 May 2026

## Context
MVP runs on an owned VPS; we must avoid premature cloud cost while protecting against data loss and keeping PII out of version control.

## Decision
**Local VPS storage** for uploads/generated content during MVP (`/data` runtime mount, gitignored), with **mandatory off-box backups** (pg_dump + WAL, and `/uploads`). Migrate to **Cloudflare R2** only at the documented scale gate. Only `data/seeds/` is source-controlled.

## Consequences
Near-zero storage cost now; clear migration path to R2. Tradeoff: single-VPS durability depends on disciplined, tested off-box backups (see system_architecture.md §20).
