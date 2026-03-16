-- Migration: telegram_users
-- Tabla para gestionar usuarios del bot de Telegram
-- Fecha: 2026-03-17
-- Feature: Agent Command Center - Telegram user management

-- ─── Tabla principal ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS telegram_users (
  -- Identificador único de Telegram
  user_id BIGINT PRIMARY KEY,

  -- Información del usuario
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  language_code TEXT DEFAULT 'es',

  -- Agente activo (el agente con el que está hablando actualmente)
  active_agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,

  -- Autorización y permisos
  is_authorized BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('viewer', 'operator', 'admin')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_interaction_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Índices ─────────────────────────────────────────────────────────────────

-- Ordenar por última interacción (para cleanup de usuarios inactivos)
CREATE INDEX IF NOT EXISTS idx_tg_users_last_interaction
  ON telegram_users(last_interaction_at DESC);

-- Buscar usuarios autorizados rápidamente
CREATE INDEX IF NOT EXISTS idx_tg_users_authorized
  ON telegram_users(is_authorized)
  WHERE is_authorized = TRUE;

-- Buscar por username (opcional, para comandos de admin)
CREATE INDEX IF NOT EXISTS idx_tg_users_username
  ON telegram_users(username)
  WHERE username IS NOT NULL;

-- ─── Comentarios ─────────────────────────────────────────────────────────────

COMMENT ON TABLE telegram_users IS
  'Usuarios del bot de Telegram con información de autorización y estado';

COMMENT ON COLUMN telegram_users.user_id IS
  'ID único de Telegram (BIGINT, no puede ser TEXT aquí)';

COMMENT ON COLUMN telegram_users.active_agent_id IS
  'ID del agente con el que el usuario está interactuando actualmente';

COMMENT ON COLUMN telegram_users.is_authorized IS
  'Si el usuario está autorizado para usar el bot (whitelist)';

COMMENT ON COLUMN telegram_users.role IS
  'Rol del usuario: viewer (solo lectura), operator (CRUD), admin (todo)';

COMMENT ON COLUMN telegram_users.last_interaction_at IS
  'Timestamp de la última interacción (para detectar usuarios inactivos)';

-- ─── Sample data para testing ────────────────────────────────────────────────

-- Insertar usuario de ejemplo (solo si no existe)
INSERT INTO telegram_users (
  user_id,
  username,
  first_name,
  language_code,
  active_agent_id,
  is_authorized,
  role
)
VALUES (
  123456789,
  'test_user',
  'Test',
  'es',
  'pm-agent',
  TRUE,
  'admin'
)
ON CONFLICT (user_id) DO NOTHING;

-- ─── Funciones helper ────────────────────────────────────────────────────────

-- Función para actualizar last_interaction_at automáticamente
CREATE OR REPLACE FUNCTION update_telegram_user_interaction()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_interaction_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar last_interaction_at en cada UPDATE
DROP TRIGGER IF EXISTS trg_telegram_user_interaction ON telegram_users;
CREATE TRIGGER trg_telegram_user_interaction
  BEFORE UPDATE ON telegram_users
  FOR EACH ROW
  EXECUTE FUNCTION update_telegram_user_interaction();

-- ─── Queries útiles ──────────────────────────────────────────────────────────

-- Ver todos los usuarios autorizados
-- SELECT user_id, username, first_name, active_agent_id, role, last_interaction_at
-- FROM telegram_users
-- WHERE is_authorized = TRUE
-- ORDER BY last_interaction_at DESC;

-- Ver usuarios inactivos (más de 30 días sin interacción)
-- SELECT user_id, username, first_name, last_interaction_at
-- FROM telegram_users
-- WHERE last_interaction_at < NOW() - INTERVAL '30 days'
-- ORDER BY last_interaction_at DESC;

-- Contar usuarios por rol
-- SELECT role, COUNT(*) as count
-- FROM telegram_users
-- WHERE is_authorized = TRUE
-- GROUP BY role;

-- ─── Verificación ────────────────────────────────────────────────────────────

-- Ver estructura de la tabla
\d telegram_users

-- Ver datos de ejemplo
SELECT
  user_id,
  username,
  first_name,
  active_agent_id,
  is_authorized,
  role,
  last_interaction_at
FROM telegram_users
ORDER BY last_interaction_at DESC
LIMIT 5;
