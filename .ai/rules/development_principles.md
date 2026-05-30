# Development Principles (shared)

> Canonical, enforceable rules: see root `CLAUDE.md` / `AGENTS.md`. This is the "why".

1. **MVP first.** Smallest correct thing that satisfies PRD v4; defer the rest.
2. **No overengineering / no premature abstraction.** Build the second real case before generalizing.
3. **No microservices.** One modular-monolith Django app on a single VPS.
4. **PostgreSQL only** (vectors via pgvector). **Django Admin** for internal tooling.
5. **Config over code.** Exams are data, never `if exam == "CTET"`.
6. **Trust is the product.** AI content is always Draft until human-approved.
7. **No business logic in the frontend.** Credits, scoring, eligibility = backend only.
8. **Every feature maps to a PRD v4 section. Every DB change is a migration.**
9. **Async via Celery; AI behind `ai_gateway`; credits enforced server-side.**
10. **Telegram before WhatsApp; local storage before cloud.**
