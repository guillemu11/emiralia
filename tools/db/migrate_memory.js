/**
 * Emiralia — Migration: Agent Memory
 *
 * Aplica únicamente la tabla agent_memory a una DB ya inicializada.
 * Seguro de ejecutar múltiples veces (CREATE IF NOT EXISTS).
 *
 * Uso: node tools/db/migrate_memory.js
 */

import pool from './pool.js';

const migration = `
-- Memoria persistente por agente
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
`;

console.log('Aplicando migration: agent_memory...');

pool.query(migration)
    .then(() => console.log('Migration aplicada correctamente.'))
    .catch(err => {
        console.error('Error en migration:', err.message);
        process.exit(1);
    })
    .finally(() => pool.end());
