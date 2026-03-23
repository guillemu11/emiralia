-- Migration: Creative Studio — creative_assets + editorial_calendar (Project 043)
-- Run: node tools/db/run-migration.js tools/db/migration_creative_studio.sql
-- Created: 2026-03-23

-- ─── creative_assets ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS creative_assets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type              VARCHAR(30) NOT NULL CHECK (type IN (
                      'image','text_to_video','image_to_video',
                      'multiframe','podcast','property_tour',
                      'carousel','infographic')),
  status            VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
                      'draft','generating','pending_review',
                      'approved','rejected','scheduled','published')),
  title             VARCHAR(500),
  brief             JSONB DEFAULT '{}',
  output_config     JSONB DEFAULT '{}',
  generated_url     TEXT,
  thumbnail_url     TEXT,
  generation_job_id VARCHAR(255),
  generation_error  TEXT,
  scheduled_at      TIMESTAMPTZ,
  agent_id          VARCHAR(50) REFERENCES agents(id),
  created_by        VARCHAR(100) DEFAULT 'human',
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── editorial_calendar ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS editorial_calendar (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_date  DATE NOT NULL,
  week_start DATE NOT NULL,
  platform   VARCHAR(20) NOT NULL CHECK (platform IN ('instagram','tiktok','linkedin','youtube')),
  asset_id   UUID REFERENCES creative_assets(id) ON DELETE SET NULL,
  status     VARCHAR(20) DEFAULT 'empty' CHECK (status IN ('empty','scheduled','published','skipped')),
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Trigger: auto-update updated_at ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_creative_assets_updated_at ON creative_assets;
CREATE TRIGGER trigger_creative_assets_updated_at
  BEFORE UPDATE ON creative_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_editorial_calendar_updated_at ON editorial_calendar;
CREATE TRIGGER trigger_editorial_calendar_updated_at
  BEFORE UPDATE ON editorial_calendar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_creative_assets_status
  ON creative_assets(status);
CREATE INDEX IF NOT EXISTS idx_creative_assets_type_status
  ON creative_assets(type, status);
CREATE INDEX IF NOT EXISTS idx_creative_assets_agent
  ON creative_assets(agent_id);
CREATE INDEX IF NOT EXISTS idx_creative_assets_created
  ON creative_assets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_editorial_calendar_week
  ON editorial_calendar(week_start);
CREATE INDEX IF NOT EXISTS idx_editorial_calendar_slot
  ON editorial_calendar(slot_date, platform);
CREATE INDEX IF NOT EXISTS idx_editorial_calendar_asset
  ON editorial_calendar(asset_id);

DO $$
BEGIN
  RAISE NOTICE 'Migration complete: creative_assets + editorial_calendar';
  RAISE NOTICE 'Verify: SELECT COUNT(*) FROM creative_assets; SELECT COUNT(*) FROM editorial_calendar;';
END $$;
