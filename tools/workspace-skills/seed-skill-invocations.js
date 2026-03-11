/**
 * Emiralia — Seed Skill Invocations
 *
 * Inserta invocaciones de skills realistas en raw_events para desarrollo/testing.
 *
 * Uso:
 *   node tools/workspace-skills/seed-skill-invocations.js           # 80 invocaciones
 *   node tools/workspace-skills/seed-skill-invocations.js --count 200
 *   node tools/workspace-skills/seed-skill-invocations.js --clear   # limpia seed data primero
 */

import { recordActivity } from './activity-harvester.js';
import pool from '../db/pool.js';

const SKILLS = [
    { name: 'planificar-sprint', domain: 'ejecucion' },
    { name: 'crear-prd', domain: 'ejecucion' },
    { name: 'historias-usuario', domain: 'ejecucion' },
    { name: 'pm-challenge', domain: 'ejecucion' },
    { name: 'pre-mortem', domain: 'ejecucion' },
    { name: 'priorizar-features', domain: 'ejecucion' },
    { name: 'estrategia-producto', domain: 'producto' },
    { name: 'propuesta-valor', domain: 'producto' },
    { name: 'perfil-cliente-ideal', domain: 'producto' },
    { name: 'analisis-competidores', domain: 'producto' },
    { name: 'tamanio-mercado', domain: 'producto' },
    { name: 'estrategia-gtm', domain: 'gtm' },
    { name: 'segmento-entrada', domain: 'gtm' },
    { name: 'loops-crecimiento', domain: 'gtm' },
    { name: 'mapa-viaje-cliente', domain: 'gtm' },
    { name: 'ideas-posicionamiento', domain: 'gtm' },
    { name: 'metricas-norte', domain: 'marketing' },
    { name: 'ideas-marketing', domain: 'marketing' },
    { name: 'battlecard-competitivo', domain: 'marketing' },
    { name: 'analisis-ab', domain: 'marketing' },
    { name: 'analisis-sentimiento', domain: 'marketing' },
    { name: 'propertyfinder-scraper', domain: 'data' },
    { name: 'consultas-sql', domain: 'data' },
    { name: 'analisis-cohortes', domain: 'data' },
    { name: 'detectar-duplicados', domain: 'data' },
    { name: 'traducir', domain: 'content' },
    { name: 'ui-ux-pro-max', domain: 'design' },
    { name: 'screenshot-loop', domain: 'design' },
    { name: 'activity-tracking', domain: 'ops' },
    { name: 'eod-report', domain: 'ops' },
    { name: 'wat-audit', domain: 'ops' },
    { name: 'skill-builder', domain: 'ops' },
    { name: 'dev-server', domain: 'ops' },
    { name: 'weekly-brainstorm', domain: 'ops' },
];

const AGENTS = [
    'pm-agent',
    'data-agent',
    'dev-agent',
    'frontend-agent',
    'content-agent',
    'translation-agent',
    'marketing-agent',
    'wat-auditor',
];

const AGENT_SKILL_AFFINITY = {
    'pm-agent': ['ejecucion', 'producto', 'gtm'],
    'data-agent': ['data', 'ops'],
    'dev-agent': ['ops'],
    'frontend-agent': ['design', 'ops'],
    'content-agent': ['content'],
    'translation-agent': ['content'],
    'marketing-agent': ['marketing', 'gtm'],
    'wat-auditor': ['ops'],
};

const STATUSES = [
    { value: 'completed', weight: 85 },
    { value: 'failed', weight: 10 },
    { value: 'timeout', weight: 5 },
];

const TRIGGERED_BY = [
    { value: 'user', weight: 70 },
    { value: 'agent', weight: 20 },
    { value: 'workflow', weight: 10 },
];

function weightedRandom(options) {
    const total = options.reduce((sum, o) => sum + o.weight, 0);
    let r = Math.random() * total;
    for (const opt of options) {
        r -= opt.weight;
        if (r <= 0) return opt.value;
    }
    return options[0].value;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickSkillForAgent(agentId) {
    const domains = AGENT_SKILL_AFFINITY[agentId] || ['ops'];
    const relevant = SKILLS.filter(s => domains.includes(s.domain));
    // 80% chance to pick from relevant domain, 20% any skill
    if (Math.random() < 0.8 && relevant.length > 0) {
        return relevant[randomInt(0, relevant.length - 1)];
    }
    return SKILLS[randomInt(0, SKILLS.length - 1)];
}

async function seed(count) {
    console.log(`[Seed] Inserting ${count} skill invocations...`);
    const now = Date.now();

    for (let i = 0; i < count; i++) {
        const agent = AGENTS[randomInt(0, AGENTS.length - 1)];
        const skill = pickSkillForAgent(agent);
        const status = weightedRandom(STATUSES);
        const triggeredBy = weightedRandom(TRIGGERED_BY);
        const durationMs = randomInt(2000, 45000);
        const daysAgo = randomInt(0, 29);
        const hoursAgo = randomInt(0, 23);
        const minutesAgo = randomInt(0, 59);
        const ts = new Date(now - (daysAgo * 86400000) - (hoursAgo * 3600000) - (minutesAgo * 60000));

        const content = {
            skill_name: skill.name,
            skill_domain: skill.domain,
            status,
            duration_ms: durationMs,
            arguments: null,
            triggered_by: triggeredBy,
        };

        await pool.query(
            `INSERT INTO raw_events (agent_id, event_type, content, timestamp)
             VALUES ($1, $2, $3, $4)`,
            [agent, 'skill_invocation', JSON.stringify(content), ts.toISOString()]
        );

        if ((i + 1) % 20 === 0) {
            console.log(`  ... ${i + 1}/${count}`);
        }
    }

    console.log(`[Seed] Done. ${count} skill_invocation events inserted.`);
}

async function clearSeed() {
    const result = await pool.query(
        `DELETE FROM raw_events WHERE event_type = 'skill_invocation' RETURNING id`
    );
    console.log(`[Seed] Cleared ${result.rowCount} skill_invocation events.`);
}

// ─── CLI ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const doClear = args.includes('--clear');
const countIdx = args.indexOf('--count');
const count = countIdx >= 0 ? parseInt(args[countIdx + 1], 10) : 80;

try {
    if (doClear) await clearSeed();
    await seed(count);
} catch (err) {
    console.error('[Seed] Error:', err.message);
    process.exit(1);
} finally {
    await pool.end();
}
