/**
 * Seed the agents table with real Emiralia agents.
 * Run: node tools/db/seed_agents.js
 */

import pool from './pool.js';

const agents = [
    {
        id: 'content-agent',
        name: 'Content Agent',
        role: 'Fichas de propiedades, blog, descripciones SEO en español',
        department: 'content',
        avatar: '✍️',
        status: 'active',
        skills: ['activity-tracking', 'generar-imagen'],
        tools: ['memory'],
    },
    {
        id: 'data-agent',
        name: 'Data Agent',
        role: 'Extrae, limpia y normaliza datos de propiedades EAU',
        department: 'data',
        avatar: '📊',
        status: 'active',
        skills: ['propertyfinder-scraper', 'activity-tracking'],
        tools: ['apify-propertyfinder', 'fetch-dataset', 'memory'],
    },
    {
        id: 'dev-agent',
        name: 'Dev Agent',
        role: 'Features, bugs, PRs en el codebase',
        department: 'dev',
        avatar: '💻',
        status: 'active',
        skills: ['dev-server', 'activity-tracking'],
        tools: ['memory'],
    },
    {
        id: 'frontend-agent',
        name: 'Design Agent',
        role: 'UI/UX, creatividades, identidad visual y prototipos',
        department: 'design',
        avatar: '🎨',
        status: 'active',
        skills: ['ui-ux-pro-max', 'screenshot-loop', 'activity-tracking'],
        tools: ['memory', 'wat-memory'],
    },
    {
        id: 'pm-agent',
        name: 'PM Agent',
        role: 'Sprints, backlog, coordinación entre agentes',
        department: 'product',
        avatar: '🧭',
        status: 'active',
        skills: ['eod-report', 'pm-challenge', 'pm-context-audit', 'activity-tracking'],
        tools: ['weekly-generator', 'eod-generator', 'wat-memory', 'memory'],
    },
    {
        id: 'translation-agent',
        name: 'Translation Agent',
        role: 'Traduccion ingles/arabe → espanol con precision inmobiliaria',
        department: 'content',
        avatar: '🌐',
        status: 'active',
        skills: ['traducir', 'activity-tracking'],
        tools: ['translate', 'memory', 'wat-memory'],
    },
    {
        id: 'research-agent',
        name: 'Research Agent',
        role: 'Monitorea fuentes externas (Anthropic, GitHub, comunidad) y genera intelligence reports para el WAT Auditor',
        department: 'ops',
        avatar: '🔬',
        status: 'active',
        skills: ['research-monitor'],
        tools: ['memory', 'wat-memory'],
    },
    {
        id: 'marketing-agent',
        name: 'Marketing Agent',
        role: 'Campañas, copies, canales de adquisición, métricas de crecimiento',
        department: 'marketing',
        avatar: '📣',
        status: 'active',
        skills: ['estrategia-gtm', 'segmento-entrada', 'priorizar-features', 'competitor-analysis', 'channel-research', 'activity-tracking'],
        tools: ['memory', 'wat-memory'],
    },
    {
        id: 'wat-auditor-agent',
        name: 'WAT Auditor Agent',
        role: 'Audita el sistema WAT completo (CLAUDE.md, agentes, skills, workflows)',
        department: 'ops',
        avatar: '🔬',
        status: 'active',
        skills: ['wat-audit'],
        tools: ['memory', 'wat-memory'],
    },
    {
        id: 'legal-agent',
        name: 'Legal Agent',
        role: 'Marco legal y regulatorio de compra de inmuebles en EAU para inversores hispanohablantes',
        department: 'legal',
        avatar: '⚖️',
        status: 'active',
        skills: ['activity-tracking'],
        tools: ['memory', 'wat-memory'],
    },
    {
        id: 'seo-agent',
        name: 'SEO & AEO Agent',
        role: 'Posicionamiento orgánico y optimización para motores de IA en español',
        department: 'seo',
        avatar: '🔍',
        status: 'active',
        skills: ['seo-audit', 'generar-keywords', 'meta-optimizer', 'structured-data-generator'],
        tools: ['memory', 'wat-memory'],
    },
    {
        id: 'social-media-agent',
        name: 'Social Media Agent',
        role: 'Contenido para Instagram y TikTok: guiones para avatares IA Fernando & Yolanda',
        department: 'marketing',
        avatar: '📱',
        status: 'active',
        skills: ['guionizar', 'brief-avatar', 'calendar-social', 'property-content'],
        tools: ['memory', 'wat-memory'],
    },
    {
        id: 'analytics-agent',
        name: 'Analytics Agent',
        role: 'Business Intelligence y analytics para developers B2B y equipo interno',
        department: 'analytics',
        avatar: '📈',
        status: 'active',
        skills: ['market-pulse', 'roi-estimator', 'plataforma-kpis'],
        tools: ['memory', 'wat-memory'],
    },
];

const REAL_IDS = agents.map(a => a.id);

async function seed() {
    console.log('Cleaning old fake agents...');
    await pool.query(
        `DELETE FROM agents WHERE id != ALL($1::text[])`,
        [REAL_IDS]
    );

    console.log('Seeding real agents...');
    for (const a of agents) {
        await pool.query(
            `INSERT INTO agents (id, name, role, department, avatar, status, skills, tools)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO UPDATE
             SET name = EXCLUDED.name, role = EXCLUDED.role, department = EXCLUDED.department,
                 avatar = EXCLUDED.avatar, status = EXCLUDED.status,
                 skills = EXCLUDED.skills, tools = EXCLUDED.tools`,
            [a.id, a.name, a.role, a.department, a.avatar, a.status,
             JSON.stringify(a.skills), JSON.stringify(a.tools)]
        );
        console.log(`  + ${a.id} (${a.name})`);
    }

    const count = await pool.query('SELECT count(*) FROM agents');
    console.log(`Done. ${count.rows[0].count} agents in DB.`);
    await pool.end();
}

seed().catch(err => { console.error(err); process.exit(1); });
