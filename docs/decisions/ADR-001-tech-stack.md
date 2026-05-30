# ADR-001: Tech Stack

- **Status:** Accepted
- **Date:** 30 May 2026

## Context
We need a stack a tiny team can ship and operate cheaply on a single VPS, that scales without a rewrite, and supports semantic dedup and Assamese-first UI.

## Decision
Next.js/TypeScript/Tailwind/shadcn (frontend); Django + DRF as a **modular monolith** (backend); PostgreSQL **+ pgvector**; Celery + Redis; self-hosted n8n; Docker Compose on one VPS. No microservices, no Kubernetes, no separate vector DB.

## Consequences
Lowest operational cost and complexity for MVP; clean module seams allow later service extraction. Tradeoff: vertical-first scaling until the documented scale gates (see system_architecture.md §17).
