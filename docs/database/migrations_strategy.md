# Migrations Strategy

- **Every schema change is a Django migration.** No manual `ALTER` in any environment; no `--fake` to mask drift.
- Migrations **apply cleanly on a fresh DB in CI** and are reversible where feasible.
- **Separate risky data migrations** from schema migrations.
- **Index every foreign key** (Postgres does not auto-index FKs).
- The **live schema's source of truth is the migration history**, not the design doc (which documents intent).
- High-volume tables (`user_answers`, `credit_transactions`, `reminder_logs`) → add **range partitioning by `created_at`** when volume warrants (see schema doc §5).
- `credit_transactions` is **append-only** — never write UPDATE/DELETE migrations against it.
- DPDP deletion is a **service routine** (anonymize PII, de-link ledger), not a destructive migration.
