-- Migration: agent_conversations
-- Tabla para persistir conversaciones con agentes desde múltiples canales
-- Fecha: 2026-03-17
-- Feature: Agent Command Center - Multi-channel conversations

-- ─── Tabla principal ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_conversations (
  id SERIAL PRIMARY KEY,

  -- Identificadores
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,  -- telegram user_id (BIGINT como TEXT) o dashboard user email
  channel TEXT NOT NULL CHECK (channel IN ('telegram', 'dashboard')),

  -- Contenido de la conversación
  messages JSONB DEFAULT '[]',  -- Array de mensajes: [{role: 'user'|'assistant', content: '...', timestamp: '...'}]

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: una conversación por usuario-agente-canal
  UNIQUE(user_id, agent_id, channel)
);

-- ─── Índices para optimizar queries ─────────────────────────────────────────

-- Buscar conversaciones por agente
CREATE INDEX IF NOT EXISTS idx_agent_conv_agent
  ON agent_conversations(agent_id);

-- Buscar conversaciones por usuario
CREATE INDEX IF NOT EXISTS idx_agent_conv_user
  ON agent_conversations(user_id);

-- Filtrar por canal
CREATE INDEX IF NOT EXISTS idx_agent_conv_channel
  ON agent_conversations(channel);

-- Ordenar por última actividad
CREATE INDEX IF NOT EXISTS idx_agent_conv_last_msg
  ON agent_conversations(last_message_at DESC);

-- Índice compuesto para buscar conversación específica rápidamente
CREATE INDEX IF NOT EXISTS idx_agent_conv_lookup
  ON agent_conversations(user_id, agent_id, channel);

-- ─── Triggers ────────────────────────────────────────────────────────────────

-- Actualizar updated_at automáticamente
CREATE TRIGGER trg_agent_conv_updated_at
  BEFORE UPDATE ON agent_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ─── Comentarios ─────────────────────────────────────────────────────────────

COMMENT ON TABLE agent_conversations IS
  'Conversaciones persistidas con agentes desde Telegram y Dashboard';

COMMENT ON COLUMN agent_conversations.user_id IS
  'Telegram user_id (como TEXT) o email de usuario de Dashboard';

COMMENT ON COLUMN agent_conversations.messages IS
  'Array JSONB de mensajes con formato: [{role, content, timestamp}, ...]';

COMMENT ON COLUMN agent_conversations.last_message_at IS
  'Timestamp del último mensaje (para ordenar conversaciones activas)';

-- ─── Sample data para testing ────────────────────────────────────────────────

-- Insertar conversación de ejemplo (solo si no existe)
INSERT INTO agent_conversations (agent_id, user_id, channel, messages, last_message_at)
VALUES (
  'pm-agent',
  'test_user_123',
  'telegram',
  '[
    {"role": "user", "content": "Hola, necesito ayuda con un proyecto", "timestamp": "2026-03-17T10:00:00Z"},
    {"role": "assistant", "content": "¡Hola! Soy el PM Agent. ¿Qué tipo de proyecto tienes en mente?", "timestamp": "2026-03-17T10:00:05Z"}
  ]'::jsonb,
  '2026-03-17T10:00:05Z'
)
ON CONFLICT (user_id, agent_id, channel) DO NOTHING;

-- ─── Verificación ────────────────────────────────────────────────────────────

-- Ver estructura de la tabla
\d agent_conversations

-- Ver datos de ejemplo
SELECT
  id,
  agent_id,
  user_id,
  channel,
  jsonb_array_length(messages) as message_count,
  last_message_at
FROM agent_conversations
ORDER BY last_message_at DESC
LIMIT 5;
