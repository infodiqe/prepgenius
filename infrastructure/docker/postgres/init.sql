-- Bootstrap extensions required by PrepGenius (SAD §0)
-- Runs once on fresh DB container init.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Shared updated_at trigger function (all mutable tables attach this)
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- n8n schema (n8n stores its own tables here)
CREATE SCHEMA IF NOT EXISTS n8n;
