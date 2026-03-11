/**
 * Emiralia — PM Agent Context Audit Checks
 *
 * Catalogo de checks organizados por dimension de auditoria.
 * Cada check es una funcion pura: async (pool, rootDir) => Finding[]
 *
 * Dimensiones:
 *   completeness  — Memory keys, secciones requeridas, BUSINESS_PLAN
 *   consistency   — Agent .md ↔ DB, skills ↔ SKILL.md, CLAUDE.md ↔ seed
 *   freshness     — Edad de memoria, cache, actividad reciente
 *   usage         — Skill tracking, WAT Memory usage, context-builder
 *   crossProject  — Conflictos entre proyectos activos
 *   alignment     — Alineacion con BUSINESS_PLAN.md
 *
 * Uso:
 *   import { getCheckRegistry } from './audit-checks.js';
 *   const registry = getCheckRegistry();
 *   const checks = registry.get('completeness');
 *   const findings = await checks[0](pool, rootDir);
 */

import fs from 'fs/promises';
import path from 'path';

// ─── Helpers (reutilizando patron de context-builder.js) ────────────────────

async function readFileSafe(filePath) {
    try {
        return await fs.readFile(filePath, 'utf-8');
    } catch {
        return null;
    }
}

async function readDirMarkdown(dirPath) {
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true, recursive: true });
        const results = [];
        for (const entry of entries) {
            if (entry.isFile() && entry.name.endsWith('.md')) {
                const fullPath = path.join(entry.parentPath || entry.path, entry.name);
                const content = await readFileSafe(fullPath);
                if (content) {
                    const relativePath = fullPath.replace(/\\/g, '/');
                    results.push({ path: relativePath, name: entry.name, content });
                }
            }
        }
        return results;
    } catch {
        return [];
    }
}

function finding(severity, dimension, code, message, details, action) {
    return { severity, dimension, code, message, details: details || {}, action: action || '' };
}

// ─── COMPLETENESS CHECKS ───────────────────────────────────────────────────

async function COM_001(pool) {
    // Cada agente en DB debe tener last_task_completed y last_task_at como shared keys
    const findings = [];
    const agentsRes = await pool.query('SELECT id, name FROM agents');
    const memoryRes = await pool.query(
        "SELECT agent_id, key FROM agent_memory WHERE scope = 'shared'"
    );

    const memoryByAgent = {};
    for (const row of memoryRes.rows) {
        if (!memoryByAgent[row.agent_id]) memoryByAgent[row.agent_id] = new Set();
        memoryByAgent[row.agent_id].add(row.key);
    }

    const requiredKeys = ['last_task_completed', 'last_task_at'];
    for (const agent of agentsRes.rows) {
        const keys = memoryByAgent[agent.id] || new Set();
        for (const req of requiredKeys) {
            if (!keys.has(req)) {
                findings.push(finding(
                    'warning', 'completeness', 'COM_001',
                    `Agente "${agent.name}" (${agent.id}) no tiene la key compartida "${req}"`,
                    { agent_id: agent.id, missing_key: req },
                    `Ejecutar: node tools/db/memory.js set ${agent.id} ${req} '"pending"' shared`
                ));
            }
        }
    }
    return findings;
}

async function COM_002(pool) {
    // context-builder trunca a 10 proyectos / 20 memory — warning si hay mas
    const findings = [];
    const [projCount, memCount] = await Promise.all([
        pool.query('SELECT count(*) FROM projects'),
        pool.query("SELECT count(*) FROM agent_memory WHERE scope = 'shared'"),
    ]);

    const totalProjects = parseInt(projCount.rows[0].count);
    const totalMemory = parseInt(memCount.rows[0].count);

    if (totalProjects > 10) {
        findings.push(finding(
            'warning', 'completeness', 'COM_002',
            `Hay ${totalProjects} proyectos en DB pero context-builder solo muestra los ultimos 10`,
            { total: totalProjects, limit: 10 },
            'Considerar aumentar el LIMIT en context-builder.js linea 122'
        ));
    }

    if (totalMemory > 20) {
        findings.push(finding(
            'warning', 'completeness', 'COM_002',
            `Hay ${totalMemory} entries de memoria compartida pero context-builder solo muestra las ultimas 20`,
            { total: totalMemory, limit: 20 },
            'Considerar aumentar el LIMIT en context-builder.js linea 123'
        ));
    }
    return findings;
}

async function COM_003(pool, rootDir) {
    // BUSINESS_PLAN.md existe y tiene seccion "Estado Actual vs Vision"
    const findings = [];
    const bpPath = path.join(rootDir, '.claude', 'BUSINESS_PLAN.md');
    const content = await readFileSafe(bpPath);

    if (!content) {
        findings.push(finding(
            'critical', 'completeness', 'COM_003',
            'BUSINESS_PLAN.md no existe en .claude/',
            {},
            'Crear .claude/BUSINESS_PLAN.md con la vision estrategica del proyecto'
        ));
    } else if (!content.includes('Estado Actual') && !content.includes('Vision')) {
        findings.push(finding(
            'warning', 'completeness', 'COM_003',
            'BUSINESS_PLAN.md no contiene seccion "Estado Actual vs Vision"',
            {},
            'Añadir seccion de estado actual vs vision para alineacion estrategica'
        ));
    }
    return findings;
}

async function COM_004(pool, rootDir) {
    // Cada agent .md tiene secciones requeridas
    const findings = [];
    const agentsDir = path.join(rootDir, '.claude', 'agents');
    const agentFiles = await readDirMarkdown(agentsDir);

    const requiredSections = [
        { pattern: /##?\s*(Misi[oó]n|Mission)/i, name: 'Mision' },
        { pattern: /##?\s*Tools?\s+disponibles/i, name: 'Tools disponibles' },
        { pattern: /##?\s*Claves?\s+de\s+memoria/i, name: 'Claves de memoria' },
    ];

    for (const file of agentFiles) {
        for (const section of requiredSections) {
            if (!section.pattern.test(file.content)) {
                findings.push(finding(
                    'warning', 'completeness', 'COM_004',
                    `Agente ${file.name} no tiene seccion "${section.name}"`,
                    { file: file.path, missing_section: section.name },
                    `Añadir seccion "${section.name}" a ${file.name}`
                ));
            }
        }
    }
    return findings;
}

// ─── CONSISTENCY CHECKS ────────────────────────────────────────────────────

async function CON_001(pool, rootDir) {
    // Agent .md en .claude/agents/ debe tener fila en tabla agents
    const findings = [];
    const agentsDir = path.join(rootDir, '.claude', 'agents');
    const agentFiles = await readDirMarkdown(agentsDir);
    const dbAgents = await pool.query('SELECT id FROM agents');
    const dbIds = new Set(dbAgents.rows.map(r => r.id));

    for (const file of agentFiles) {
        // Extraer ID del frontmatter o del nombre del archivo
        const nameMatch = file.content.match(/^---[\s\S]*?name:\s*(.+?)[\s\n]/m);
        const fileId = nameMatch
            ? nameMatch[1].trim()
            : file.name.replace('.md', '');

        if (!dbIds.has(fileId)) {
            findings.push(finding(
                'warning', 'consistency', 'CON_001',
                `Agente "${fileId}" tiene .md pero no esta registrado en tabla agents`,
                { file: file.path, agent_id: fileId },
                `Registrar en seed_agents.js y ejecutar: node tools/db/seed_agents.js`
            ));
        }
    }

    // Inverso: agentes en DB sin .md
    const fileIds = new Set(agentFiles.map(f => {
        const m = f.content.match(/^---[\s\S]*?name:\s*(.+?)[\s\n]/m);
        return m ? m[1].trim() : f.name.replace('.md', '');
    }));

    for (const row of dbAgents.rows) {
        if (!fileIds.has(row.id)) {
            findings.push(finding(
                'warning', 'consistency', 'CON_001',
                `Agente "${row.id}" esta en DB pero no tiene archivo .md en .claude/agents/`,
                { agent_id: row.id },
                `Crear .claude/agents/{dept}/${row.id}.md con la definicion del agente`
            ));
        }
    }
    return findings;
}

async function CON_002(pool, rootDir) {
    // Skills listados en agent .md deben existir como SKILL.md
    const findings = [];
    const agentsDir = path.join(rootDir, '.claude', 'agents');
    const agentFiles = await readDirMarkdown(agentsDir);
    const skillsDir = path.join(rootDir, '.claude', 'skills');

    // Inventariar skills existentes
    let existingSkills = new Set();
    try {
        const entries = await fs.readdir(skillsDir, { withFileTypes: true, recursive: true });
        for (const entry of entries) {
            if (entry.isFile() && entry.name === 'SKILL.md') {
                const parent = path.basename(entry.parentPath || entry.path);
                existingSkills.add(parent);
            }
        }
    } catch { /* no skills dir */ }

    for (const file of agentFiles) {
        // Buscar referencias a /skill-name (excluir placeholders como /nombre-skill)
        const placeholders = new Set(['nombre-skill', 'skill-name', 'example-skill']);
        const skillRefs = file.content.match(/`\/([a-z][a-z0-9-]+)`/g) || [];
        for (const ref of skillRefs) {
            const skillName = ref.replace(/`/g, '').replace('/', '');
            if (placeholders.has(skillName)) continue;
            if (!existingSkills.has(skillName)) {
                findings.push(finding(
                    'critical', 'consistency', 'CON_002',
                    `Agente ${file.name} referencia skill "/${skillName}" que no tiene SKILL.md`,
                    { file: file.path, skill: skillName },
                    `Crear .claude/skills/{dominio}/${skillName}/SKILL.md`
                ));
            }
        }
    }
    return findings;
}

async function CON_003(pool, rootDir) {
    // Skills en seed_agents.js deben coincidir con lo documentado en agent .md
    const findings = [];
    const seedPath = path.join(rootDir, 'tools', 'db', 'seed_agents.js');
    const seedContent = await readFileSafe(seedPath);

    if (!seedContent) {
        findings.push(finding(
            'critical', 'consistency', 'CON_003',
            'seed_agents.js no encontrado en tools/db/',
            {},
            'Verificar que tools/db/seed_agents.js existe'
        ));
        return findings;
    }

    // Parsear skills por agente del seed (regex simple)
    const agentBlocks = seedContent.match(/\{[^}]*id:\s*'([^']+)'[^}]*skills:\s*\[([^\]]*)\][^}]*\}/gs) || [];

    for (const block of agentBlocks) {
        const idMatch = block.match(/id:\s*'([^']+)'/);
        const skillsMatch = block.match(/skills:\s*\[([^\]]*)\]/);
        if (!idMatch || !skillsMatch) continue;

        const agentId = idMatch[1];
        const seedSkills = (skillsMatch[1].match(/'([^']+)'/g) || []).map(s => s.replace(/'/g, ''));

        // Leer el .md del agente
        const agentsDir = path.join(rootDir, '.claude', 'agents');
        const agentFiles = await readDirMarkdown(agentsDir);
        const agentFile = agentFiles.find(f =>
            f.name === `${agentId}.md` || f.content.includes(`name: ${agentId}`)
        );

        if (agentFile) {
            for (const skill of seedSkills) {
                if (!agentFile.content.includes(skill)) {
                    findings.push(finding(
                        'suggestion', 'consistency', 'CON_003',
                        `Skill "${skill}" esta en seed_agents.js para ${agentId} pero no aparece en su .md`,
                        { agent_id: agentId, skill },
                        `Documentar skill "${skill}" en ${agentFile.name}`
                    ));
                }
            }
        }
    }
    return findings;
}

async function CON_004(pool, rootDir) {
    // Conteo de agentes en CLAUDE.md vs seed_agents.js vs DB
    const findings = [];

    const claudeMd = await readFileSafe(path.join(rootDir, '.claude', 'CLAUDE.md'));
    const dbCount = await pool.query('SELECT count(*) FROM agents');
    const seedContent = await readFileSafe(path.join(rootDir, 'tools', 'db', 'seed_agents.js'));

    const dbTotal = parseInt(dbCount.rows[0].count);

    // Contar agentes en seed
    let seedTotal = 0;
    if (seedContent) {
        seedTotal = (seedContent.match(/id:\s*'/g) || []).length;
    }

    if (seedTotal !== dbTotal) {
        findings.push(finding(
            'warning', 'consistency', 'CON_004',
            `Desincronizacion: seed_agents.js tiene ${seedTotal} agentes, DB tiene ${dbTotal}`,
            { seed: seedTotal, db: dbTotal },
            'Ejecutar: node tools/db/seed_agents.js para sincronizar'
        ));
    }

    return findings;
}

// ─── FRESHNESS CHECKS ──────────────────────────────────────────────────────

async function FRE_001(pool, rootDir, options = {}) {
    // Shared memory entries con updated_at > threshold
    const thresholdDays = options.freshnessThresholdDays || 7;
    const findings = [];
    const res = await pool.query(
        `SELECT agent_id, key, updated_at
         FROM agent_memory
         WHERE scope = 'shared'
           AND updated_at < NOW() - INTERVAL '${thresholdDays} days'
         ORDER BY updated_at ASC`
    );

    for (const row of res.rows) {
        const daysSince = Math.floor((Date.now() - new Date(row.updated_at).getTime()) / (1000 * 60 * 60 * 24));
        findings.push(finding(
            'suggestion', 'freshness', 'FRE_001',
            `Memoria "${row.key}" de ${row.agent_id} tiene ${daysSince} dias sin actualizar`,
            { agent_id: row.agent_id, key: row.key, updated_at: row.updated_at, days_stale: daysSince },
            `Verificar si ${row.agent_id} necesita ejecutar su tarea asociada`
        ));
    }
    return findings;
}

async function FRE_002() {
    // Cache estatico sin TTL
    return [finding(
        'suggestion', 'freshness', 'FRE_002',
        'El cache estatico de context-builder.js no tiene TTL — nunca expira automaticamente',
        { file: 'tools/pm-agent/context-builder.js', line: 55 },
        'Considerar añadir TTL o invalidacion automatica al cache'
    )];
}

async function FRE_003(pool) {
    // Ultima auditoria WAT > 14 dias
    const findings = [];
    const res = await pool.query(
        "SELECT value, updated_at FROM agent_memory WHERE agent_id = 'wat-auditor-agent' AND key = 'last_audit_at' AND scope = 'shared'"
    );

    if (res.rows.length === 0) {
        findings.push(finding(
            'warning', 'freshness', 'FRE_003',
            'No se ha ejecutado ninguna auditoria WAT (last_audit_at no existe)',
            {},
            'Ejecutar /wat-audit para establecer baseline'
        ));
    } else {
        const lastAudit = new Date(res.rows[0].value || res.rows[0].updated_at);
        const daysSince = Math.floor((Date.now() - lastAudit.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince > 14) {
            findings.push(finding(
                'warning', 'freshness', 'FRE_003',
                `Ultima auditoria WAT fue hace ${daysSince} dias (umbral: 14)`,
                { last_audit_at: lastAudit.toISOString(), days_since: daysSince },
                'Ejecutar /wat-audit para actualizar estado del sistema'
            ));
        }
    }
    return findings;
}

async function FRE_004(pool) {
    // Ultima actividad PM Agent > 3 dias
    const findings = [];
    const res = await pool.query(
        "SELECT MAX(timestamp) as last_activity FROM raw_events WHERE agent_id = 'pm-agent'"
    );

    if (!res.rows[0]?.last_activity) {
        findings.push(finding(
            'suggestion', 'freshness', 'FRE_004',
            'PM Agent no tiene actividad registrada en raw_events',
            {},
            'Verificar que PM Agent esta registrando actividad con activity-harvester'
        ));
    } else {
        const daysSince = Math.floor((Date.now() - new Date(res.rows[0].last_activity).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince > 3) {
            findings.push(finding(
                'suggestion', 'freshness', 'FRE_004',
                `PM Agent no ha tenido actividad en ${daysSince} dias`,
                { last_activity: res.rows[0].last_activity, days_since: daysSince },
                'Considerar ejecutar tareas del PM Agent'
            ));
        }
    }
    return findings;
}

async function FRE_005(pool) {
    // Proyectos en DB > LIMIT 10
    const findings = [];
    const res = await pool.query('SELECT count(*) FROM projects');
    const total = parseInt(res.rows[0].count);

    if (total > 10) {
        findings.push(finding(
            'warning', 'freshness', 'FRE_005',
            `Hay ${total} proyectos pero el contexto del PM Agent solo muestra los ultimos 10`,
            { total_projects: total, context_limit: 10 },
            'El PM Agent podria tomar decisiones sin visibilidad de proyectos antiguos activos'
        ));
    }
    return findings;
}

// ─── USAGE CHECKS ──────────────────────────────────────────────────────────

async function USE_001(pool) {
    // PM Agent tiene skill_invocation_count en memoria
    const findings = [];
    const res = await pool.query(
        "SELECT value FROM agent_memory WHERE agent_id = 'pm-agent' AND key = 'skill_invocation_count'"
    );

    if (res.rows.length === 0) {
        findings.push(finding(
            'warning', 'usage', 'USE_001',
            'PM Agent no tiene skill_invocation_count en memoria — skills no se estan tracking',
            {},
            'Verificar que los skills del PM Agent incluyen llamadas a skill-tracker.js'
        ));
    } else {
        const count = res.rows[0].value;
        if (count === 0) {
            findings.push(finding(
                'suggestion', 'usage', 'USE_001',
                'PM Agent tiene skill_invocation_count = 0',
                { count },
                'Ninguna invocacion de skill registrada para el PM Agent'
            ));
        }
    }
    return findings;
}

async function USE_002(pool) {
    // raw_events con agent_id='pm-agent' en ultimos 7 dias
    const findings = [];
    const res = await pool.query(
        "SELECT count(*) FROM raw_events WHERE agent_id = 'pm-agent' AND timestamp > NOW() - INTERVAL '7 days'"
    );
    const count = parseInt(res.rows[0].count);

    if (count === 0) {
        findings.push(finding(
            'warning', 'usage', 'USE_002',
            'PM Agent no tiene eventos en los ultimos 7 dias',
            { events_7d: 0 },
            'El PM Agent deberia registrar actividad regularmente'
        ));
    }
    return findings;
}

async function USE_003(pool) {
    // WAT Memory consultada por PM Agent en ultimos 14 dias
    const findings = [];
    const res = await pool.query(
        `SELECT count(*) FROM raw_events
         WHERE agent_id = 'pm-agent'
           AND timestamp > NOW() - INTERVAL '14 days'
           AND content::text LIKE '%wat-memory%'`
    );
    const count = parseInt(res.rows[0].count);

    if (count === 0) {
        findings.push(finding(
            'suggestion', 'usage', 'USE_003',
            'PM Agent no ha consultado WAT Memory en los ultimos 14 dias',
            { wat_memory_queries_14d: 0 },
            'El PM Agent deberia consultar WAT Memory antes de tomar decisiones estrategicas'
        ));
    }
    return findings;
}

async function USE_004(pool, rootDir) {
    // Verificar cobertura de tracking via skill-coverage-checker
    const findings = [];
    try {
        const checkerPath = path.join(rootDir, 'tools', 'workspace-skills', 'skill-coverage-checker.js');
        const exists = await readFileSafe(checkerPath);
        if (!exists) {
            findings.push(finding(
                'suggestion', 'usage', 'USE_004',
                'skill-coverage-checker.js no encontrado — no se puede verificar cobertura de tracking',
                {},
                'Verificar que tools/workspace-skills/skill-coverage-checker.js existe'
            ));
        }
        // Nota: la ejecucion real del checker se hace desde el SKILL.md via Bash
    } catch { /* ignore */ }
    return findings;
}

// ─── CROSS-PROJECT CHECKS ──────────────────────────────────────────────────

async function XPR_001(pool) {
    // Proyectos activos y posibles conflictos
    const findings = [];

    // Verificar si hay proyectos activos
    const res = await pool.query(
        "SELECT id, name, status, department FROM projects WHERE status IN ('Planning', 'In Progress') ORDER BY department"
    );

    if (res.rows.length === 0) {
        return findings; // No hay proyectos activos, no hay conflictos
    }

    // Agrupar por departamento para detectar sobrecargas
    const byDept = {};
    for (const row of res.rows) {
        const dept = row.department || 'sin-dept';
        if (!byDept[dept]) byDept[dept] = [];
        byDept[dept].push(row);
    }

    for (const [dept, projects] of Object.entries(byDept)) {
        if (projects.length > 2) {
            findings.push(finding(
                'warning', 'crossProject', 'XPR_001',
                `Departamento "${dept}" tiene ${projects.length} proyectos activos simultaneos`,
                { department: dept, projects: projects.map(p => p.name) },
                'Considerar priorizar y serializar proyectos en este departamento'
            ));
        }
    }
    return findings;
}

async function XPR_002(pool) {
    // Proyectos sin departamento asignado
    const findings = [];
    const res = await pool.query(
        "SELECT id, name FROM projects WHERE (department IS NULL OR department = '') AND status != 'Archived'"
    );

    for (const row of res.rows) {
        findings.push(finding(
            'suggestion', 'crossProject', 'XPR_002',
            `Proyecto "${row.name}" (ID: ${row.id}) no tiene departamento asignado`,
            { project_id: row.id, project_name: row.name },
            'Asignar un departamento responsable al proyecto'
        ));
    }
    return findings;
}

async function XPR_003(pool) {
    // Proyectos activos sin tareas
    const findings = [];
    try {
        const res = await pool.query(
            `SELECT p.id, p.name FROM projects p
             LEFT JOIN phases ph ON ph.project_id = p.id
             LEFT JOIN tasks t ON t.phase_id = ph.id
             WHERE p.status IN ('Planning', 'In Progress')
             GROUP BY p.id, p.name
             HAVING count(t.id) = 0`
        );

        for (const row of res.rows) {
            findings.push(finding(
                'warning', 'crossProject', 'XPR_003',
                `Proyecto activo "${row.name}" no tiene tareas definidas`,
                { project_id: row.id },
                'Desglosar el proyecto en fases y tareas ejecutables'
            ));
        }
    } catch {
        // Tables might not exist yet
    }
    return findings;
}

// ─── ALIGNMENT CHECKS ─────────────────────────────────────────────────────

async function ALI_001(pool, rootDir) {
    // Proyectos activos fuera de scope UAE
    const findings = [];
    const res = await pool.query(
        "SELECT id, name, description FROM projects WHERE status IN ('Planning', 'In Progress')"
    );

    const nonUaeKeywords = ['españa', 'spain', 'mexico', 'colombia', 'latam', 'europa', 'multi-region'];

    for (const row of res.rows) {
        const text = (row.name + ' ' + (row.description || '')).toLowerCase();
        for (const keyword of nonUaeKeywords) {
            if (text.includes(keyword)) {
                findings.push(finding(
                    'warning', 'alignment', 'ALI_001',
                    `Proyecto "${row.name}" menciona "${keyword}" — posible scope creep fuera de UAE`,
                    { project_id: row.id, keyword },
                    'Verificar alineacion con BUSINESS_PLAN.md: Phase 0/1 es UAE-only'
                ));
                break;
            }
        }
    }
    return findings;
}

async function ALI_002(pool) {
    // Deteccion de B2C drift
    const findings = [];
    const res = await pool.query(
        "SELECT id, name, description FROM projects WHERE status IN ('Planning', 'In Progress')"
    );

    const b2cKeywords = ['inversor', 'investor', 'comprador', 'buyer', 'lead scoring', 'crm'];
    const b2bKeywords = ['developer', 'promotor', 'listing', 'dashboard', 'analytics', 'roi'];

    for (const row of res.rows) {
        const text = (row.name + ' ' + (row.description || '')).toLowerCase();
        const hasB2C = b2cKeywords.some(k => text.includes(k));
        const hasB2B = b2bKeywords.some(k => text.includes(k));

        if (hasB2C && !hasB2B) {
            findings.push(finding(
                'suggestion', 'alignment', 'ALI_002',
                `Proyecto "${row.name}" parece B2C-only — verificar que tambien aporta valor al developer (B2B)`,
                { project_id: row.id },
                'BUSINESS_PLAN indica que el cliente pagador son developers, no inversores directamente'
            ));
        }
    }
    return findings;
}

async function ALI_003(pool, rootDir) {
    // BUSINESS_PLAN.md sin revision en >30 dias
    const findings = [];
    const bpPath = path.join(rootDir, '.claude', 'BUSINESS_PLAN.md');
    const content = await readFileSafe(bpPath);

    if (content) {
        const dateMatch = content.match(/[Uu]ltima\s+revisi[oó]n[:\s]+(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
            const lastRevision = new Date(dateMatch[1]);
            const daysSince = Math.floor((Date.now() - lastRevision.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSince > 30) {
                findings.push(finding(
                    'suggestion', 'alignment', 'ALI_003',
                    `BUSINESS_PLAN.md no se ha revisado en ${daysSince} dias (ultima: ${dateMatch[1]})`,
                    { last_revision: dateMatch[1], days_since: daysSince },
                    'Revisar y actualizar BUSINESS_PLAN.md con el estado actual del proyecto'
                ));
            }
        }
    }
    return findings;
}

// ─── REGISTRY ──────────────────────────────────────────────────────────────

/**
 * Devuelve el registro completo de checks organizados por dimension.
 * @returns {Map<string, Function[]>}
 */
export function getCheckRegistry() {
    return new Map([
        ['completeness', [COM_001, COM_002, COM_003, COM_004]],
        ['consistency', [CON_001, CON_002, CON_003, CON_004]],
        ['freshness', [FRE_001, FRE_002, FRE_003, FRE_004, FRE_005]],
        ['usage', [USE_001, USE_002, USE_003, USE_004]],
        ['crossProject', [XPR_001, XPR_002, XPR_003]],
        ['alignment', [ALI_001, ALI_002, ALI_003]],
    ]);
}
