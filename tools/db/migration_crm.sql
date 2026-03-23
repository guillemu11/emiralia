-- Migration: CRM Emiralia — leads extension + developers + deals + subscriptions + communications (Project 045)
-- Run: node tools/db/run-migration.js tools/db/migration_crm.sql
-- Created: 2026-03-23
-- Order matters: developers must exist before ALTER leads adds FK

-- ─── Ensure update_updated_at_column function exists ─────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── developers ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS developers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL,
  email       VARCHAR(200) UNIQUE,
  company     VARCHAR(200),
  phone       VARCHAR(50),
  website     VARCHAR(500),
  tier        VARCHAR(20) DEFAULT 'prospect'
    CHECK (tier IN ('prospect','trial','active','churned')),
  notes       TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_developers_updated_at ON developers;
CREATE TRIGGER trigger_developers_updated_at
  BEFORE UPDATE ON developers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_developers_tier   ON developers(tier);
CREATE INDEX IF NOT EXISTS idx_developers_email  ON developers(email);

-- ─── subscriptions ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id  UUID NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  plan          VARCHAR(30) DEFAULT 'starter'
    CHECK (plan IN ('starter','pro','enterprise')),
  mrr           NUMERIC(12,2) DEFAULT 0,
  currency      VARCHAR(10) DEFAULT 'USD',
  status        VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('active','cancelled','paused')),
  start_date    DATE DEFAULT CURRENT_DATE,
  end_date      DATE,
  notes         TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trigger_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_subscriptions_developer ON subscriptions(developer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status    ON subscriptions(status);

-- ─── deals ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS deals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id  UUID REFERENCES developers(id) ON DELETE SET NULL,
  title         VARCHAR(300) NOT NULL,
  stage         VARCHAR(30) DEFAULT 'prospecting'
    CHECK (stage IN ('prospecting','contacted','demo_scheduled','proposal_sent','negotiation','closed_won','closed_lost')),
  value         NUMERIC(12,2) DEFAULT 0,
  probability   SMALLINT DEFAULT 10 CHECK (probability BETWEEN 0 AND 100),
  assigned_to   VARCHAR(100),
  lost_reason   TEXT,
  closed_at     TIMESTAMPTZ,
  notes         TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_deals_updated_at ON deals;
CREATE TRIGGER trigger_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_deals_stage       ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_developer   ON deals(developer_id);
CREATE INDEX IF NOT EXISTS idx_deals_created     ON deals(created_at DESC);

-- ─── communications ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS communications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type  VARCHAR(20) NOT NULL CHECK (entity_type IN ('developer','lead')),
  entity_id    VARCHAR(100) NOT NULL,  -- UUID o integer (leads.id es SERIAL)
  channel      VARCHAR(20) NOT NULL
    CHECK (channel IN ('email','whatsapp','call','meeting','note')),
  summary      TEXT NOT NULL,
  created_by   VARCHAR(100) DEFAULT 'human',
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comms_entity      ON communications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comms_created     ON communications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comms_channel     ON communications(channel);

-- ─── developer_projects ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS developer_projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id  UUID NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  name          VARCHAR(300) NOT NULL,
  location      VARCHAR(200),
  units         INTEGER,
  status        VARCHAR(30) DEFAULT 'active'
    CHECK (status IN ('active','sold_out','coming_soon','paused')),
  notes         TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_dev_projects_updated_at ON developer_projects;
CREATE TRIGGER trigger_dev_projects_updated_at
  BEFORE UPDATE ON developer_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_dev_projects_developer ON developer_projects(developer_id);
CREATE INDEX IF NOT EXISTS idx_dev_projects_status    ON developer_projects(status);

-- ─── lead_assignments ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_assignments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  developer_id      UUID NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  commission_amount NUMERIC(12,2) DEFAULT 0,
  status            VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending','paid','cancelled')),
  assigned_at       TIMESTAMPTZ DEFAULT NOW(),
  paid_at           TIMESTAMPTZ,
  notes             TEXT,
  UNIQUE(lead_id, developer_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_assignments_lead      ON lead_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_developer ON lead_assignments(developer_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_status    ON lead_assignments(status);

-- ─── ALTER TABLE leads ────────────────────────────────────────────────────────

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'captured'
    CHECK (status IN ('captured','qualifying','qualified','assigned','converted','lost'));

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS qualified_by VARCHAR(100);

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS deal_value NUMERIC(12,2);

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS assigned_developer_id UUID REFERENCES developers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_status   ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_developer_id);

-- ─── Summary ─────────────────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE 'Migration CRM complete:';
  RAISE NOTICE '  + developers (tier: prospect/trial/active/churned)';
  RAISE NOTICE '  + subscriptions (plan: starter/pro/enterprise, MRR)';
  RAISE NOTICE '  + deals (7 stages pipeline)';
  RAISE NOTICE '  + communications (email/whatsapp/call/meeting/note)';
  RAISE NOTICE '  + developer_projects';
  RAISE NOTICE '  + lead_assignments (commissions)';
  RAISE NOTICE '  ~ leads: +status +qualified_by +deal_value +assigned_developer_id';
END $$;
