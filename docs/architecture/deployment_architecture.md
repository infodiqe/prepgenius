# Deployment Architecture (extract)

> **Source of truth:** `system_architecture.md` §16 (Deployment), §17 (Scalability), §20 (Backup & DR). Edit there.

Single VPS, Docker Compose: `nginx` (TLS via Let's Encrypt) → `next`, `django` (gunicorn/uvicorn), `celery-worker`, `celery-beat`, `redis`, `postgres+pgvector`, `n8n`. Stateless app tier (state in PG/Redis/storage). CI/CD via GitHub Actions: build → test → deploy over SSH/Compose, with migrations as a gated release step. Local storage now; Cloudflare R2 at the scale gate. No Kubernetes, no managed cloud for MVP. Off-box DB (pg_dump + WAL) and `/uploads` backups are mandatory before go-live, with tested restores.
