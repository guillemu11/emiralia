/**
 * Emiralia — Agent Memory Tool
 *
 * Lectura y escritura de memoria persistente por agente.
 * Usa la tabla `agent_memory` (key-value store por agente).
 *
 * Diferencia con raw_events:
 *   raw_events  → historial append-only (qué pasó)
 *   agent_memory → estado actual (qué recuerda el agente ahora)
 *
 * Uso desde código:
 *   import { setMemory, getMemory, listMemory, getSharedMemory } from './tools/db/memory.js';
 *
 * Uso CLI:
 *   node tools/db/memory.js set <agentId> <key> <value_json> [shared]
 *   node tools/db/memory.js get <agentId> <key>
 *   node tools/db/memory.js list <agentId>
 *   node tools/db/memory.js shared <key>
 */

import pool from './pool.js';

/**
 * Escribe o actualiza un valor en la memoria del agente (upsert por agent_id + key).
 * @param {string} agentId  - ID del agente (ej: 'data-agent')
 * @param {string} key      - Clave de memoria (ej: 'last_scrape_url')
 * @param {*}      value    - Valor a guardar (se serializa como JSONB)
 * @param {string} scope    - 'private' (solo el agente) | 'shared' (legible por todos)
 */
export async function setMemory(agentId, key, value, scope = 'private') {
    const query = `
        INSERT INTO agent_memory (agent_id, key, value, scope)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (agent_id, key)
        DO UPDATE SET value = EXCLUDED.value, scope = EXCLUDED.scope, updated_at = NOW()
        RETURNING id, updated_at;
    `;
    const res = await pool.query(query, [agentId, key, JSON.stringify(value), scope]);
    return res.rows[0];
}

/**
 * Lee un valor de la memoria privada del agente.
 * @param {string} agentId
 * @param {string} key
 * @returns {*} El valor guardado, o null si no existe.
 */
export async function getMemory(agentId, key) {
    const query = `
        SELECT value, scope, updated_at
        FROM agent_memory
        WHERE agent_id = $1 AND key = $2;
    `;
    const res = await pool.query(query, [agentId, key]);
    return res.rows[0] ?? null;
}

/**
 * Lista toda la memoria de un agente.
 * @param {string} agentId
 * @returns {Array<{key, value, scope, updated_at}>}
 */
export async function listMemory(agentId) {
    const query = `
        SELECT key, value, scope, updated_at
        FROM agent_memory
        WHERE agent_id = $1
        ORDER BY updated_at DESC;
    `;
    const res = await pool.query(query, [agentId]);
    return res.rows;
}

/**
 * Lee memorias compartidas por clave, de cualquier agente.
 * Útil para coordinación cross-agente (Fase 2 — WAT Memory).
 * @param {string} key
 * @returns {Array<{agent_id, value, updated_at}>}
 */
export async function getSharedMemory(key) {
    const query = `
        SELECT agent_id, value, updated_at
        FROM agent_memory
        WHERE key = $1 AND scope = 'shared'
        ORDER BY updated_at DESC;
    `;
    const res = await pool.query(query, [key]);
    return res.rows;
}

// ─── CLI ────────────────────────────────────────────────────────────────────

const [,, cmd, ...args] = process.argv;
const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('memory.js');

if (cmd && isDirectRun) {
    try {
        if (cmd === 'set') {
            const [agentId, key, valueJson, scope] = args;
            if (!agentId || !key || !valueJson) {
                console.error('Uso: node tools/db/memory.js set <agentId> <key> <value_json> [shared]');
                process.exit(1);
            }
            const value = JSON.parse(valueJson);
            const result = await setMemory(agentId, key, value, scope || 'private');
            console.log(`[Memory] Set "${key}" para ${agentId} (ID: ${result.id})`);

        } else if (cmd === 'get') {
            const [agentId, key] = args;
            if (!agentId || !key) {
                console.error('Uso: node tools/db/memory.js get <agentId> <key>');
                process.exit(1);
            }
            const row = await getMemory(agentId, key);
            if (!row) {
                console.log(`[Memory] No encontrado: "${key}" para ${agentId}`);
            } else {
                console.log(`[Memory] ${agentId}.${key} (${row.scope}):`);
                console.log(JSON.stringify(row.value, null, 2));
                console.log(`Actualizado: ${row.updated_at}`);
            }

        } else if (cmd === 'list') {
            const [agentId] = args;
            if (!agentId) {
                console.error('Uso: node tools/db/memory.js list <agentId>');
                process.exit(1);
            }
            const rows = await listMemory(agentId);
            if (rows.length === 0) {
                console.log(`[Memory] Sin memoria registrada para ${agentId}`);
            } else {
                console.log(`[Memory] Memoria de ${agentId} (${rows.length} entradas):\n`);
                for (const row of rows) {
                    console.log(`  [${row.scope}] ${row.key}: ${JSON.stringify(row.value)} (${row.updated_at})`);
                }
            }

        } else if (cmd === 'shared') {
            const [key] = args;
            if (!key) {
                console.error('Uso: node tools/db/memory.js shared <key>');
                process.exit(1);
            }
            const rows = await getSharedMemory(key);
            if (rows.length === 0) {
                console.log(`[Memory] Sin memorias compartidas para key "${key}"`);
            } else {
                console.log(`[Memory] Memorias compartidas para "${key}":\n`);
                for (const row of rows) {
                    console.log(`  ${row.agent_id}: ${JSON.stringify(row.value)} (${row.updated_at})`);
                }
            }

        } else {
            console.error(`Comando desconocido: ${cmd}. Usa set | get | list | shared`);
            process.exit(1);
        }
    } catch (err) {
        console.error('[Memory] Error:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}
