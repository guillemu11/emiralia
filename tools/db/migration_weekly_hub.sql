-- ============================================================
-- Emiralia — Weekly Planning Hub Migration
-- ============================================================

-- ─── INBOX ITEMS ─────────────────────────────────────────────
-- Central inbox for ideas from Telegram, Dashboard chat, and Agent brainstorms

CREATE TABLE IF NOT EXISTS inbox_items (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    source TEXT NOT NULL CHECK (source IN ('telegram', 'dashboard', 'agent')),
    source_user TEXT,
    department TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'reviewing', 'approved', 'assigned', 'discarded')),
    conversation JSONB DEFAULT '[]',
    structured_data JSONB,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    weekly_session_id INTEGER REFERENCES weekly_sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbox_department ON inbox_items(department);
CREATE INDEX IF NOT EXISTS idx_inbox_status ON inbox_items(status);
CREATE INDEX IF NOT EXISTS idx_inbox_created ON inbox_items(created_at DESC);

CREATE OR REPLACE TRIGGER trg_inbox_items_updated_at
BEFORE UPDATE ON inbox_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── WEEKLY BRAINSTORMS ──────────────────────────────────────
-- Agent contributions during weekly brainstorming sessions

CREATE TABLE IF NOT EXISTS weekly_brainstorms (
    id SERIAL PRIMARY KEY,
    weekly_session_id INTEGER NOT NULL REFERENCES weekly_sessions(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    contribution_type TEXT CHECK (contribution_type IN ('proposal', 'improvement', 'concern', 'insight')),
    content TEXT NOT NULL,
    context JSONB,
    user_response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brainstorm_session ON weekly_brainstorms(weekly_session_id);

-- ─── WEEKLY SESSIONS — New columns ──────────────────────────
ALTER TABLE weekly_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE weekly_sessions ADD COLUMN IF NOT EXISTS report JSONB;
ALTER TABLE weekly_sessions ADD COLUMN IF NOT EXISTS inbox_snapshot JSONB;
ALTER TABLE weekly_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ─── TASKS — Missing columns used by save_project.js ────────
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Task';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium';
