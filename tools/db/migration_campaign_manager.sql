-- Migration: Campaign Manager — campaigns + campaign_items (Project 044)
-- Run: node tools/db/run-migration.js tools/db/migration_campaign_manager.sql
-- Created: 2026-03-23

-- ─── campaigns ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(500) NOT NULL,
  description     TEXT,
  goal            TEXT,
  target_audience TEXT,
  channels        JSONB DEFAULT '[]',
  budget_total    NUMERIC(12,2),
  budget_spent    NUMERIC(12,2) DEFAULT 0,
  currency        VARCHAR(10) DEFAULT 'USD',
  start_date      DATE,
  end_date        DATE,
  status          VARCHAR(30) DEFAULT 'planning'
    CHECK (status IN ('planning','briefing','producing','reviewing','active','paused','completed')),
  created_by      VARCHAR(100) DEFAULT 'human',
  agent_id        VARCHAR(50) REFERENCES agents(id),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── campaign_items ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaign_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  channel           VARCHAR(50) NOT NULL,
  content_type      VARCHAR(50) NOT NULL,
  title             VARCHAR(500),
  assigned_agent    VARCHAR(50) REFERENCES agents(id),
  status            VARCHAR(30) DEFAULT 'pending'
    CHECK (status IN ('pending','briefing','producing','pending_review','approved','scheduled','published','rejected')),
  artifact_id       UUID REFERENCES artifacts(id) ON DELETE SET NULL,
  creative_asset_id UUID,
  scheduled_at      TIMESTAMPTZ,
  published_at      TIMESTAMPTZ,
  ad_platform       VARCHAR(30),
  ad_budget         NUMERIC(10,2),
  ad_spend_actual   NUMERIC(10,2),
  ad_brief          JSONB DEFAULT '{}',
  notes             TEXT,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Trigger: auto-update updated_at ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_campaigns_updated_at ON campaigns;
CREATE TRIGGER trigger_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_campaign_items_updated_at ON campaign_items;
CREATE TRIGGER trigger_campaign_items_updated_at
  BEFORE UPDATE ON campaign_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_campaigns_status
  ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_agent
  ON campaigns(agent_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates
  ON campaigns(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_campaign_items_campaign
  ON campaign_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_items_status
  ON campaign_items(status);
CREATE INDEX IF NOT EXISTS idx_campaign_items_agent
  ON campaign_items(assigned_agent);
CREATE INDEX IF NOT EXISTS idx_campaign_items_scheduled
  ON campaign_items(scheduled_at);

DO $$
BEGIN
  RAISE NOTICE 'Migration complete: campaigns + campaign_items';
  RAISE NOTICE 'Verify: SELECT COUNT(*) FROM campaigns; SELECT COUNT(*) FROM campaign_items;';
END $$;
