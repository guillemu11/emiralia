-- ============================================================
-- Emiralia — Database Schema
-- ============================================================

CREATE TABLE IF NOT EXISTS properties (
  -- Identificación
  pf_id                TEXT PRIMARY KEY,
  url                  TEXT,
  listing_id           TEXT,
  reference            TEXT,
  rera                 TEXT,

  -- Título y descripción
  title                TEXT,
  description          TEXT,
  display_address      TEXT,

  -- Ubicación
  building_name        TEXT,
  community            TEXT,
  community_name       TEXT,
  city                 TEXT,
  location_tree        JSONB,
  latitude             NUMERIC(10, 7),
  longitude            NUMERIC(10, 7),

  -- Características del inmueble
  property_type        TEXT,
  property_type_id     INTEGER,
  listing_type         TEXT,   -- 'Residential for Sale', etc.
  bedrooms             TEXT,
  bedrooms_value       INTEGER,
  bathrooms            INTEGER,
  size_sqft            NUMERIC(10, 2),
  size_min             TEXT,
  size_unit            TEXT DEFAULT 'sqft',
  furnishing           TEXT,
  completion_status    TEXT,

  -- Precio
  price_aed            BIGINT,
  price_currency       TEXT DEFAULT 'AED',
  price_duration       TEXT,   -- 'sell'
  payment_method       JSONB,

  -- Amenidades y multimedia
  features             JSONB,  -- array de strings ["Balcony", ...]
  amenities            JSONB,  -- array de códigos ["BA", "SP", ...]
  images               JSONB,  -- array de URLs

  -- Agente
  agent_name           TEXT,
  agent_phone          TEXT,
  agent_whatsapp       TEXT,
  agent_email          TEXT,
  agent_info           JSONB,

  -- Agencia (broker)
  broker_name          TEXT,
  broker_phone         TEXT,
  broker_email         TEXT,
  broker_info          JSONB,

  -- Flags
  is_verified          BOOLEAN DEFAULT FALSE,
  is_off_plan          BOOLEAN DEFAULT FALSE,
  is_premium           BOOLEAN DEFAULT FALSE,
  is_exclusive         BOOLEAN DEFAULT FALSE,
  is_direct_developer  BOOLEAN DEFAULT FALSE,
  is_new_construction  BOOLEAN DEFAULT FALSE,
  is_available         BOOLEAN DEFAULT TRUE,
  is_featured          BOOLEAN DEFAULT FALSE,
  listing_level        TEXT,

  -- Datos originales completos
  raw_data             JSONB,

  -- Auditoría
  added_on_pf          TIMESTAMPTZ,  -- fecha en PropertyFinder
  scraped_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_properties_city        ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_community   ON properties(community);
CREATE INDEX IF NOT EXISTS idx_properties_type        ON properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_price       ON properties(price_aed);
CREATE INDEX IF NOT EXISTS idx_properties_off_plan    ON properties(is_off_plan);
CREATE INDEX IF NOT EXISTS idx_properties_scraped_at  ON properties(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_location    ON properties USING GIST (
  point(longitude, latitude)
) WHERE longitude IS NOT NULL AND latitude IS NOT NULL;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_properties_updated_at
BEFORE UPDATE ON properties
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── GESTIÓN DE PROYECTOS Y TAREAS (EMIRALIA OS) ──────────────────────────────

-- Tabla de Proyectos
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    problem TEXT,
    solution TEXT,
    success_metrics JSONB DEFAULT '[]',
    blocks JSONB DEFAULT '[]',
    department TEXT DEFAULT 'General',
    sub_area TEXT DEFAULT 'General',
    pain_points JSONB DEFAULT '[]',
    requirements JSONB DEFAULT '[]',
    risks JSONB DEFAULT '[]',
    estimated_budget DECIMAL DEFAULT 0,
    estimated_timeline TEXT DEFAULT 'TBD',
    future_improvements JSONB DEFAULT '[]',
    status TEXT DEFAULT 'Planning', -- Planning, In Progress, Completed, Paused
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Fases
CREATE TABLE IF NOT EXISTS phases (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    phase_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    objective TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Tareas
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    phase_id INTEGER REFERENCES phases(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    agent TEXT, -- Data Agent, Dev Agent, etc.
    effort TEXT, -- S, M, L
    status TEXT DEFAULT 'Todo', -- Todo, In Progress, Done
    dependencies JSONB DEFAULT '[]',
    type TEXT DEFAULT 'Task', -- Task, Bug, Enhancement
    priority TEXT DEFAULT 'Medium', -- Low, Medium, High, Critical
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_phases_project ON phases(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_phase ON tasks(phase_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Trigger para updated_at en projects y tasks
CREATE OR REPLACE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── AGENTES Y WORKSPACE ───────────────────────────────────────────────────

-- Tabla de Agentes
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY, -- ex: 'data-agent'
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT NOT NULL, -- data, dev, seo, etc.
    status TEXT DEFAULT 'idle', -- active, idle, offline
    avatar TEXT, -- emoji o URL
    skills JSONB DEFAULT '[]',
    tools JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de EOD Reports
CREATE TABLE IF NOT EXISTS eod_reports (
    id SERIAL PRIMARY KEY,
    agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed_tasks JSONB DEFAULT '[]',
    in_progress_tasks JSONB DEFAULT '[]',
    blockers JSONB DEFAULT '[]',
    insights JSONB DEFAULT '[]',
    plan_tomorrow JSONB DEFAULT '[]',
    mood TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, date)
);

-- Tabla de Weekly Sessions
CREATE TABLE IF NOT EXISTS weekly_sessions (
    id SERIAL PRIMARY KEY,
    department TEXT NOT NULL,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    week_number INTEGER NOT NULL,
    steps_data JSONB DEFAULT '{}',
    final_projects JSONB DEFAULT '[]',
    status TEXT DEFAULT 'active',
    report JSONB,
    inbox_snapshot JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    department TEXT,
    agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    details TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- Triggers adicionales
CREATE OR REPLACE TRIGGER trg_agents_updated_at
BEFORE UPDATE ON agents
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Índices adicionales
CREATE INDEX IF NOT EXISTS idx_eod_date ON eod_reports(date);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(date DESC);


-- Tabla de Raw Events (Alerta de eventos granulares para generar EODs)
CREATE TABLE IF NOT EXISTS raw_events (
    id SERIAL PRIMARY KEY,
    agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- tool_call, message, error, commit
    content JSONB NOT NULL,    -- detalle del evento
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_raw_events_agent_date ON raw_events(agent_id, timestamp);

-- ─── MEMORIA DE AGENTES ────────────────────────────────────────────────────────

-- Tabla de estado persistente por agente (key-value store)
-- A diferencia de raw_events (historial), esta tabla guarda el estado ACTUAL.
-- scope = 'private' → solo el agente propietario puede escribirla
-- scope = 'shared'  → cualquier agente puede leerla (cross-agent memory)
CREATE TABLE IF NOT EXISTS agent_memory (
    id          SERIAL PRIMARY KEY,
    agent_id    TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    key         TEXT NOT NULL,
    value       JSONB NOT NULL,
    scope       TEXT NOT NULL DEFAULT 'private' CHECK (scope IN ('private', 'shared')),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (agent_id, key)
);

CREATE INDEX IF NOT EXISTS idx_agent_memory_agent  ON agent_memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_shared ON agent_memory(key) WHERE scope = 'shared';

CREATE OR REPLACE TRIGGER trg_agent_memory_updated_at
BEFORE UPDATE ON agent_memory
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── PM REPORTS ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pm_reports (
    id          SERIAL PRIMARY KEY,
    title       TEXT NOT NULL,
    summary     TEXT,
    body_md     TEXT,
    metrics     JSONB DEFAULT '{}',
    risks       JSONB DEFAULT '[]',
    next_steps  JSONB DEFAULT '[]',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_reports_created ON pm_reports(created_at DESC);

-- ─── INBOX ITEMS (Weekly Planning Hub) ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS inbox_items (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    source TEXT NOT NULL CHECK (source IN ('telegram', 'dashboard', 'agent')),
    source_user TEXT,
    department TEXT,
    status TEXT DEFAULT 'chat' CHECK (status IN ('chat', 'borrador', 'proyecto', 'discarded')),
    conversation JSONB DEFAULT '[]',
    summary TEXT,
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

-- ─── WEEKLY BRAINSTORMS ──────────────────────────────────────────────────────

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

-- ─── WORKFLOW RUNS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_runs (
    id            SERIAL PRIMARY KEY,
    workflow_id   TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','running','completed','failed')),
    triggered_by  TEXT NOT NULL DEFAULT 'user'
                  CHECK (triggered_by IN ('user','schedule','agent')),
    started_at    TIMESTAMPTZ DEFAULT NOW(),
    completed_at  TIMESTAMPTZ,
    duration_ms   INTEGER,
    output_summary TEXT,
    error         TEXT,
    metadata      JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wf_runs_workflow ON workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wf_runs_status ON workflow_runs(status);
CREATE INDEX IF NOT EXISTS idx_wf_runs_started ON workflow_runs(started_at DESC);

-- ─── DEDUP: Detección de duplicados cross-broker ─────────────────────────────
-- duplicate_of    → pf_id del listing canónico. NULL = canónico o no evaluado.
-- duplicate_group → mismo valor para todos los pf_ids del mismo inmueble físico.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS duplicate_of    TEXT REFERENCES properties(pf_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duplicate_group TEXT;

CREATE INDEX IF NOT EXISTS idx_properties_duplicate_of
  ON properties(duplicate_of) WHERE duplicate_of IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_duplicate_group
  ON properties(duplicate_group) WHERE duplicate_group IS NOT NULL;

-- ─── PRICE DROPS (PanicSelling.xyz) ──────────────────────────────────────────
-- Tracks luxury property price drops in Dubai from panicselling.xyz

CREATE TABLE IF NOT EXISTS price_drops (
  id                SERIAL PRIMARY KEY,
  source_id         TEXT UNIQUE,           -- hash/ID único del listing en la fuente
  source_url        TEXT,                  -- URL del listing original (PropertyFinder, Bayut, etc.)
  title             TEXT,
  location          TEXT,                  -- Community / area
  property_type     TEXT,                  -- Apartment, Villa, Penthouse, etc.
  bedrooms          TEXT,
  bathrooms         TEXT,
  size_sqft         NUMERIC(10, 2),

  original_price    BIGINT,                -- Precio original antes del drop
  current_price     BIGINT,                -- Precio actual
  price_drop_aed    BIGINT,                -- Diferencia en AED
  price_drop_pct    NUMERIC(5, 2),         -- Porcentaje de descuento
  price_currency    TEXT DEFAULT 'AED',

  developer         TEXT,
  building_name     TEXT,
  image_url         TEXT,

  listed_date       TEXT,                  -- Fecha original del listing
  drop_detected_at  TEXT,                  -- Cuándo se detectó el drop

  raw_data          JSONB,                 -- Datos completos extraídos
  scraped_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_drops_location     ON price_drops(location);
CREATE INDEX IF NOT EXISTS idx_price_drops_type         ON price_drops(property_type);
CREATE INDEX IF NOT EXISTS idx_price_drops_current      ON price_drops(current_price);
CREATE INDEX IF NOT EXISTS idx_price_drops_pct          ON price_drops(price_drop_pct DESC);
CREATE INDEX IF NOT EXISTS idx_price_drops_scraped      ON price_drops(scraped_at DESC);

CREATE OR REPLACE TRIGGER trg_price_drops_updated_at
BEFORE UPDATE ON price_drops
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── LEADS (Early Access & Contact Forms) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  country         TEXT,
  interests       JSONB DEFAULT '[]',      -- Array of interest tags
  source          TEXT,                    -- 'interes', 'invertir', 'ai-insights', 'desarrollador'
  message         TEXT,                    -- Optional message from user
  metadata        JSONB DEFAULT '{}',      -- Additional data (UTM params, etc.)
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_email      ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created    ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source     ON leads(source);

CREATE OR REPLACE TRIGGER trg_leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

