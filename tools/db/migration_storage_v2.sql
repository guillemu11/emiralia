-- Migration: Storage V2 — storage_key columns + missing indexes (Project 043)
-- Run: node tools/db/run-migration.js tools/db/migration_storage_v2.sql
-- Created: 2026-03-23
--
-- What this adds:
--   1. storage_key       — R2/local key for the main asset file
--   2. thumbnail_storage_key — R2/local key for the thumbnail
--   3. Index on created_by     (used in most list queries, was missing)
--   4. Partial index on pending_review assets   (most-queried status)
--   5. Composite index on (type, created_at)    (gallery filter by type)

-- ─── New columns ──────────────────────────────────────────────────────────────

ALTER TABLE creative_assets
    ADD COLUMN IF NOT EXISTS storage_key           TEXT,
    ADD COLUMN IF NOT EXISTS thumbnail_storage_key TEXT;

-- ─── Missing indexes ─────────────────────────────────────────────────────────

-- created_by is used in agent-specific queries — previously missing
CREATE INDEX IF NOT EXISTS idx_creative_assets_created_by
    ON creative_assets(created_by);

-- Partial index: pending_review is the most queried status (review queue)
CREATE INDEX IF NOT EXISTS idx_creative_assets_pending_review
    ON creative_assets(created_at DESC)
    WHERE status = 'pending_review';

-- Composite: gallery filtered by type, ordered by newest
CREATE INDEX IF NOT EXISTS idx_creative_assets_type_created
    ON creative_assets(type, created_at DESC);

-- ─── Verify ───────────────────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE 'Migration storage_v2 complete.';
  RAISE NOTICE 'Verify: SELECT column_name FROM information_schema.columns WHERE table_name = ''creative_assets'' AND column_name IN (''storage_key'', ''thumbnail_storage_key'');';
END $$;
