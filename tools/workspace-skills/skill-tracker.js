/**
 * Emiralia — Skill Usage Tracker
 *
 * Registra invocaciones de skills en raw_events con event_type='skill_invocation'.
 * Actualiza agent_memory con last_skill_used y skill_invocation_count (shared).
 *
 * Uso desde código:
 *   import { trackSkill } from './tools/workspace-skills/skill-tracker.js';
 *   await trackSkill('pm-agent', 'planificar-sprint', 'ejecucion', 'completed', 9000, 'Sprint 5', 'user');
 *
 * Uso CLI:
 *   node tools/workspace-skills/skill-tracker.js record <agentId> <skillName> <domain> <status> [durationMs] [args] [triggeredBy]
 */

import { recordActivity } from './activity-harvester.js';
import { setMemory, getMemory } from '../db/memory.js';
import pool from '../db/pool.js';

/**
 * Registra una invocación de skill.
 * @param {string} agentId     - ID del agente (ej: 'pm-agent')
 * @param {string} skillName   - Nombre del skill (ej: 'planificar-sprint')
 * @param {string} domain      - Dominio del skill (ej: 'ejecucion')
 * @param {string} status      - 'completed' | 'failed' | 'timeout'
 * @param {number} [durationMs] - Duración en milisegundos
 * @param {string} [args]       - Argumentos pasados al skill
 * @param {string} [triggeredBy] - 'user' | 'agent' | 'workflow'
 * @returns {number} ID del evento insertado
 */
export async function trackSkill(agentId, skillName, domain, status, durationMs, args, triggeredBy) {
    const eventId = await recordActivity(agentId, 'skill_invocation', {
        skill_name: skillName,
        skill_domain: domain || 'unknown',
        status: status || 'completed',
        duration_ms: durationMs ? Number(durationMs) : null,
        arguments: args || null,
        triggered_by: triggeredBy || 'user',
    });

    // Best-effort memory update (no throw on failure)
    try {
        await setMemory(agentId, 'last_skill_used', {
            skill_name: skillName,
            skill_domain: domain,
            status: status || 'completed',
            at: new Date().toISOString(),
        }, 'shared');

        const current = await getMemory(agentId, 'skill_invocation_count');
        const count = (current?.value ?? 0) + 1;
        await setMemory(agentId, 'skill_invocation_count', count, 'shared');
    } catch (err) {
        console.error('[SkillTracker] Memory update failed (non-blocking):', err.message);
    }

    return eventId;
}

// ─── CLI ────────────────────────────────────────────────────────────────────

const [,, cmd, ...args] = process.argv;
const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('skill-tracker.js');

if (cmd === 'record' && isDirectRun) {
    const [agentId, skillName, domain, status, durationMs, skillArgs, triggeredBy] = args;

    if (!agentId || !skillName || !domain) {
        console.error('Uso: node tools/workspace-skills/skill-tracker.js record <agentId> <skillName> <domain> <status> [durationMs] [args] [triggeredBy]');
        console.error('Ejemplo: node tools/workspace-skills/skill-tracker.js record pm-agent planificar-sprint ejecucion completed 9000 "Sprint 5" user');
        process.exit(1);
    }

    try {
        const eventId = await trackSkill(agentId, skillName, domain, status, durationMs, skillArgs, triggeredBy);
        console.log(`[SkillTracker] Recorded skill_invocation: ${skillName} by ${agentId} (event ID: ${eventId})`);
    } catch (err) {
        console.error('[SkillTracker] Error:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
} else if (cmd && isDirectRun) {
    console.error(`Comando desconocido: ${cmd}. Usa: record`);
    process.exit(1);
}
