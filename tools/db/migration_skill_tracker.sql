-- Migration: Skill Usage Tracker
-- Adds partial index on raw_events for skill_invocation events

CREATE INDEX IF NOT EXISTS idx_raw_events_skill_invocation
  ON raw_events(timestamp DESC)
  WHERE event_type = 'skill_invocation';

-- Composite index for agent-based skill queries
CREATE INDEX IF NOT EXISTS idx_raw_events_skill_by_agent
  ON raw_events(agent_id, timestamp DESC)
  WHERE event_type = 'skill_invocation';
