-- Migration: artifacts system (Project 039 — Agent Workspaces)
-- Run: node tools/db/run-migration.js tools/db/migration_artifacts.sql

CREATE TABLE IF NOT EXISTS artifacts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id         VARCHAR(50) REFERENCES agents(id),
  type             VARCHAR(50) NOT NULL,
  status           VARCHAR(20) DEFAULT 'draft',
  title            VARCHAR(500),
  content          TEXT,
  metadata         JSONB DEFAULT '{}',
  rejection_reason TEXT,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS artifact_publications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id    UUID REFERENCES artifacts(id) ON DELETE CASCADE,
  destination    VARCHAR(50),
  destination_id VARCHAR(255),
  status         VARCHAR(20) DEFAULT 'pending',
  published_at   TIMESTAMP,
  metrics        JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS artifact_handoffs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id   UUID REFERENCES artifacts(id) ON DELETE CASCADE,
  from_agent_id VARCHAR(50) REFERENCES agents(id),
  to_agent_id   VARCHAR(50) REFERENCES agents(id),
  instruction   TEXT,
  status        VARCHAR(20) DEFAULT 'pending',
  completed_at  TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_artifacts_agent_status  ON artifacts(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_artifacts_type_status   ON artifacts(type, status);
CREATE INDEX IF NOT EXISTS idx_artifact_pubs_artifact  ON artifact_publications(artifact_id);
CREATE INDEX IF NOT EXISTS idx_artifact_handoffs_to    ON artifact_handoffs(to_agent_id, status);
