# PrepGenius AI

Personalized Learning & Assessment Platform for Regional Competitive Exams (Assam TET / CTET first).
This repository holds the product/engineering documentation and the application monorepo.

## Repository map

| Path | What lives here |
|---|---|
| `CLAUDE.md` | Canonical rules for **Claude Code** (auto-loaded at root). |
| `AGENTS.md` | Canonical rules for **Codex / Cursor / OpenCode** (auto-loaded at root). |
| `opencode.json` | OpenCode config — loads `AGENTS.md` + key docs as instructions. |
| `.ai/` | Machine context for AI agents (principles, prompts, glossary, overview). |
| `docs/prd/` | Product Requirements — **v4 is canonical**; v2/v3 archived. |
| `docs/architecture/` | System Architecture (master) + focused extracts. |
| `docs/database/` | Schema design, ERD, migration strategy. |
| `docs/ui-ux/` | UI/UX spec, design system, screen inventory. |
| `docs/product/` | User stories (md + import CSV), epics, roadmap, sprint plan. |
| `docs/decisions/` | Architecture Decision Records (ADRs). |
| `frontend/` | Next.js + TypeScript + Tailwind + shadcn/ui app. |
| `backend/` | Django + DRF (modular monolith). Unit tests live per app here. |
| `infrastructure/` | Docker Compose, Nginx, ops scripts. `backups/` is runtime-only. |
| `data/seeds/` | Source-controlled seed fixtures (e.g., CTET exam config). |
| `data/uploads/`, `data/generated/` | **Runtime only — gitignored.** Never commit PII/content. |
| `tests/e2e/` | Cross-cutting end-to-end tests (unit tests stay with their code). |

## Source-of-truth rules
- Product → `docs/prd/prepgenius_prd_v4.md`
- Architecture → `docs/architecture/system_architecture.md`
- Live DB schema → **backend migrations** (the design doc documents intent)
- Agent rules → `CLAUDE.md` / `AGENTS.md` (root). Edit these, not copies.

## Conventions
- Every PR cites the PRD v4 section it implements.
- Every schema change is a Django migration. No manual DB edits.
- AI-generated content is always Draft until human-approved.
- No business logic in the frontend; credits enforced at the backend.

_Last updated: 30 May 2026_
