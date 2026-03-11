/**
 * Emiralia — WAT Memory Tool (Fase 2)
 *
 * Lee el estado compartido entre agentes. Permite que cualquier agente
 * consulte qué saben y qué han hecho los demás sin comunicación directa.
 *
 * Construido sobre agent_memory (Fase 1) + raw_events (actividad reciente).
 *
 * Uso desde código:
 *   import { getSystemState, getAgentState } from './tools/db/wat-memory.js';
 *
 * Uso CLI:
 *   node tools/db/wat-memory.js status              → estado global de todos los agentes
 *   node tools/db/wat-memory.js agent <agentId>     → estado completo de un agente
 *   node tools/db/wat-memory.js check <agentId> <key>  → ¿qué sabe otro agente sobre X?
 */

import pool from './pool.js';

/**
 * Devuelve el estado global del sistema: memoria compartida de todos los agentes
 * + su actividad reciente en raw_events.
 * Útil para el PM Agent al inicio de cada sesión de coordinación.
 *
 * @returns {Object} { agents: [{id, name, status, shared_memory, recent_events}] }
 */
export async function getSystemState() {
    // Memoria compartida de todos los agentes
    const memoryRes = await pool.query(`
        SELECT am.agent_id, a.name, a.status, am.key, am.value, am.updated_at
        FROM agent_memory am
        JOIN agents a ON a.id = am.agent_id
        WHERE am.scope = 'shared'
        ORDER BY am.agent_id, am.updated_at DESC;
    `);

    // Últimos 5 eventos por agente (subquery para evitar aggregate en window function)
    const eventsRes = await pool.query(`
        SELECT agent_id,
            json_agg(json_build_object(
                'event_type', event_type,
                'content', content,
                'timestamp', timestamp
            ) ORDER BY timestamp DESC) AS recent_events
        FROM (
            SELECT agent_id, event_type, content, timestamp,
                   ROW_NUMBER() OVER (PARTITION BY agent_id ORDER BY timestamp DESC) AS rn
            FROM raw_events
            WHERE timestamp > NOW() - INTERVAL '7 days'
        ) sub
        WHERE rn <= 5
        GROUP BY agent_id;
    `);

    // Agrupar por agente
    const agentMap = {};

    for (const row of memoryRes.rows) {
        if (!agentMap[row.agent_id]) {
            agentMap[row.agent_id] = {
                id: row.agent_id,
                name: row.name,
                status: row.status,
                shared_memory: {},
                recent_events: [],
            };
        }
        agentMap[row.agent_id].shared_memory[row.key] = {
            value: row.value,
            updated_at: row.updated_at,
        };
    }

    for (const row of eventsRes.rows) {
        if (agentMap[row.agent_id]) {
            agentMap[row.agent_id].recent_events = (row.recent_events || []).slice(0, 5);
        }
    }

    return { agents: Object.values(agentMap) };
}

/**
 * Devuelve el estado completo de un agente: memoria privada + compartida + eventos recientes.
 * Útil para que un agente se auto-consulte al inicio de su turno.
 *
 * @param {string} agentId
 * @returns {Object} { id, name, status, memory: {key: {value, scope, updated_at}}, recent_events }
 */
export async function getAgentState(agentId) {
    const [agentRes, memoryRes, eventsRes] = await Promise.all([
        pool.query(`SELECT id, name, role, status FROM agents WHERE id = $1`, [agentId]),
        pool.query(`
            SELECT key, value, scope, updated_at
            FROM agent_memory
            WHERE agent_id = $1
            ORDER BY updated_at DESC;
        `, [agentId]),
        pool.query(`
            SELECT event_type, content, timestamp
            FROM raw_events
            WHERE agent_id = $1
            ORDER BY timestamp DESC
            LIMIT 10;
        `, [agentId]),
    ]);

    if (agentRes.rows.length === 0) return null;

    const agent = agentRes.rows[0];
    const memory = {};
    for (const row of memoryRes.rows) {
        memory[row.key] = { value: row.value, scope: row.scope, updated_at: row.updated_at };
    }

    return {
        ...agent,
        memory,
        recent_events: eventsRes.rows,
    };
}

/**
 * Lee una clave específica de la memoria compartida de otro agente.
 * Permite coordinación puntual sin leer el estado completo.
 *
 * @param {string} agentId - ID del agente al que se consulta
 * @param {string} key     - Clave de memoria a consultar
 * @returns {*} El valor, o null si no existe o no es compartido.
 */
export async function checkAgentMemory(agentId, key) {
    const res = await pool.query(`
        SELECT value, updated_at
        FROM agent_memory
        WHERE agent_id = $1 AND key = $2 AND scope = 'shared';
    `, [agentId, key]);
    return res.rows[0] ?? null;
}

// ─── Helpers de impresión ────────────────────────────────────────────────────

function printSystemState(state) {
    if (state.agents.length === 0) {
        console.log('[WAT] No hay memoria compartida registrada aun.');
        return;
    }
    console.log(`\n=== EMIRALIA SYSTEM STATE ===`);
    console.log(`Agentes con memoria compartida: ${state.agents.length}\n`);
    for (const agent of state.agents) {
        console.log(`--- ${agent.name} (${agent.id}) [${agent.status}] ---`);
        const keys = Object.keys(agent.shared_memory);
        if (keys.length === 0) {
            console.log('  Sin memoria compartida');
        } else {
            for (const key of keys) {
                const m = agent.shared_memory[key];
                console.log(`  ${key}: ${JSON.stringify(m.value)}  (${m.updated_at})`);
            }
        }
        if (agent.recent_events.length > 0) {
            console.log(`  Ultimo evento: ${agent.recent_events[0].event_type} — ${agent.recent_events[0].timestamp}`);
        }
        console.log('');
    }
}

function printAgentState(state) {
    console.log(`\n=== ESTADO: ${state.name} (${state.id}) ===`);
    console.log(`Rol: ${state.role} | Status: ${state.status}\n`);

    const keys = Object.keys(state.memory);
    if (keys.length === 0) {
        console.log('Memoria: vacia');
    } else {
        console.log('Memoria:');
        for (const key of keys) {
            const m = state.memory[key];
            console.log(`  [${m.scope}] ${key}: ${JSON.stringify(m.value)}  (${m.updated_at})`);
        }
    }

    if (state.recent_events.length > 0) {
        console.log(`\nEventos recientes (${state.recent_events.length}):`);
        for (const e of state.recent_events.slice(0, 5)) {
            console.log(`  [${e.event_type}] ${e.timestamp}`);
        }
    }
    console.log('');
}

// ─── CLI ────────────────────────────────────────────────────────────────────

const [,, cmd, ...args] = process.argv;

if (cmd) {
    try {
        if (cmd === 'status') {
            const state = await getSystemState();
            printSystemState(state);

        } else if (cmd === 'agent') {
            const [agentId] = args;
            if (!agentId) {
                console.error('Uso: node tools/db/wat-memory.js agent <agentId>');
                process.exit(1);
            }
            const state = await getAgentState(agentId);
            if (!state) {
                console.log(`[WAT] Agente "${agentId}" no encontrado.`);
            } else {
                printAgentState(state);
            }

        } else if (cmd === 'check') {
            const [agentId, key] = args;
            if (!agentId || !key) {
                console.error('Uso: node tools/db/wat-memory.js check <agentId> <key>');
                process.exit(1);
            }
            const row = await checkAgentMemory(agentId, key);
            if (!row) {
                console.log(`[WAT] "${key}" de ${agentId}: no disponible (privado o inexistente)`);
            } else {
                console.log(`[WAT] ${agentId}.${key}: ${JSON.stringify(row.value)}`);
                console.log(`      Actualizado: ${row.updated_at}`);
            }

        } else {
            console.error(`Comando desconocido: "${cmd}". Usa: status | agent | check`);
            process.exit(1);
        }
    } catch (err) {
        console.error('[WAT] Error:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}
