/**
 * Emiralia Dashboard — Backend Server
 *
 * API for Projects (original) + Workspace (agents, weeklies, dailys, collaboration, audit).
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import { chatWithPMAgent, extractJSON, generateSummary, generateProject } from '../../tools/pm-agent/core.js';
import { saveProject } from '../../tools/db/save_project.js';
import { buildProjectContext } from '../../tools/pm-agent/context-builder.js';
import { buildAgentContext } from '../../tools/core/context-builder.js';
import { getConversation, saveConversation } from '../../tools/db/conversation_queries.js';
import { logEvent, EVENT_TYPES } from '../../tools/core/event-logger.js';
import Anthropic from '@anthropic-ai/sdk';
import { generateEodReport } from '../../tools/workspace-skills/eod-generator.js';
import { completeProject } from '../../tools/db/complete_project.js';

const { Pool } = pg;
const app = express();
const port = process.env.PORT || process.env.DASHBOARD_PORT || 3001;

app.use(cors());
app.use(express.json());

// ─── API Key Auth Middleware (Feature 11: Security & Auth) ──────────────────

/**
 * Simple API Key authentication for Dashboard endpoints.
 * If DASHBOARD_API_KEY is set, all /api/* endpoints require X-API-Key header.
 * If not set, logs warning and allows all requests (dev mode).
 */
app.use((req, res, next) => {
  // Only apply to /api/ routes
  if (!req.path.startsWith('/api/')) {
    return next();
  }

  const apiKey = req.headers['x-api-key'];
  const validKey = process.env.DASHBOARD_API_KEY;

  if (!validKey) {
    console.warn('[Dashboard] DASHBOARD_API_KEY not set - API is PUBLIC!');
    return next(); // Allow in dev if not configured
  }

  if (apiKey !== validKey) {
    return res.status(401).json({ error: 'Unauthorized - Invalid API key' });
  }

  next();
});

// Configuración de PostgreSQL: usar DATABASE_URL si está disponible (Railway, Heroku, etc.)
// Si no, usar variables individuales (desarrollo local)
const pool = process.env.DATABASE_URL
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: false }
    })
    : new Pool({
        host: process.env.PG_HOST || 'localhost',
        port: parseInt(process.env.PG_PORT || '5433', 10),
        database: process.env.PG_DB || 'emiralia',
        user: process.env.PG_USER || 'emiralia',
        password: process.env.PG_PASSWORD || 'changeme',
        ssl: { rejectUnauthorized: false }
    });

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Helper: Audit Log ──────────────────────────────────────────────────────

async function logAudit(eventType, department, title, details, agentId = null) {
    await pool.query(
        `INSERT INTO audit_log (event_type, department, agent_id, title, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [eventType, department, agentId, title, details]
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECTS (original endpoints)
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/projects', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/projects', async (req, res) => {
    try {
        const { name, problem, solution, blocks, success_metrics, department, sub_area, pain_points, requirements, risks, estimated_budget, estimated_timeline, future_improvements } = req.body;
        const result = await pool.query(
            `INSERT INTO projects (name, problem, solution, blocks, success_metrics, department, sub_area, pain_points, requirements, risks, estimated_budget, estimated_timeline, future_improvements, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
            [name || 'Nuevo Proyecto', problem || '', solution || '',
             JSON.stringify(blocks || []), JSON.stringify(success_metrics || []),
             department || 'General', sub_area || 'General',
             JSON.stringify(pain_points || []), JSON.stringify(requirements || []),
             JSON.stringify(risks || []), estimated_budget || 0,
             estimated_timeline || 'TBD', JSON.stringify(future_improvements || []), 'Planning']
        );
        await logAudit('project', department || 'General', `Proyecto creado: ${name}`, 'Nuevo proyecto via dashboard');
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/projects/:id', async (req, res) => {
    try {
        const projectRes = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
        if (projectRes.rows.length === 0) return res.status(404).json({ error: 'Proyecto no encontrado' });
        const project = projectRes.rows[0];

        const phasesRes = await pool.query('SELECT * FROM phases WHERE project_id = $1 ORDER BY phase_number ASC', [req.params.id]);
        const phases = phasesRes.rows;

        if (phases.length > 0) {
            const tasksRes = await pool.query('SELECT * FROM tasks WHERE phase_id = ANY($1) ORDER BY created_at ASC', [phases.map(p => p.id)]);
            phases.forEach(phase => { phase.tasks = tasksRes.rows.filter(t => t.phase_id === phase.id); });
        }

        project.phases = phases;
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/projects/:id', async (req, res) => {
    try {
        const { name, problem, solution, status, blocks, success_metrics, department, sub_area, pain_points, requirements, risks, estimated_budget, estimated_timeline, future_improvements } = req.body;
        await pool.query(
            `UPDATE projects
             SET name=$1, problem=$2, solution=$3, status=$4, blocks=$5, success_metrics=$6,
                 department=$7, sub_area=$8, pain_points=$9, requirements=$10, risks=$11,
                 estimated_budget=$12, estimated_timeline=$13, future_improvements=$14, updated_at=NOW()
             WHERE id=$15`,
            [name, problem, solution, status, JSON.stringify(blocks), JSON.stringify(success_metrics),
             department, sub_area, JSON.stringify(pain_points), JSON.stringify(requirements),
             JSON.stringify(risks), estimated_budget, estimated_timeline, JSON.stringify(future_improvements), req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/projects/:id/complete', async (req, res) => {
    try {
        const { notes } = req.body || {};
        const result = await completeProject(parseInt(req.params.id, 10), { notes });

        if (!result.success) {
            return res.status(404).json({ error: result.error });
        }

        if (result.alreadyCompleted) {
            return res.json({ alreadyCompleted: true, message: result.message });
        }

        res.json({
            success: true,
            summary: result.summary,
            auditLogId: result.auditLogId,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/projects/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Pipeline ──
app.get('/api/pipeline', async (req, res) => {
    try {
        const { department } = req.query;
        let query = `
            SELECT p.*,
                (SELECT COUNT(*) FROM tasks t JOIN phases ph ON t.phase_id = ph.id WHERE ph.project_id = p.id) as total_tasks,
                (SELECT COUNT(*) FROM tasks t JOIN phases ph ON t.phase_id = ph.id WHERE ph.project_id = p.id AND t.status = 'Done') as done_tasks
            FROM projects p
        `;
        const params = [];
        if (department) {
            params.push(department);
            query += ` WHERE LOWER(p.department) = LOWER($${params.length})`;
        }
        query += ' ORDER BY p.updated_at DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/projects/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Planning', 'In Progress', 'Completed', 'Paused'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: `Status invalido. Validos: ${validStatuses.join(', ')}` });
        }
        const result = await pool.query(
            'UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [status, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Proyecto no encontrado' });
        await logAudit('project', result.rows[0].department, `Proyecto "${result.rows[0].name}" → ${status}`, `Status change`);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/tasks/:id', async (req, res) => {
    try {
        const { status } = req.body;
        await pool.query('UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2', [status, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// AGENTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/agents', async (req, res) => {
    try {
        const { department } = req.query;
        let query = 'SELECT * FROM agents';
        const params = [];
        if (department) {
            query += ' WHERE department = $1';
            params.push(department);
        }
        query += ' ORDER BY department, name';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/agents/:id', async (req, res) => {
    try {
        const agentRes = await pool.query('SELECT * FROM agents WHERE id = $1', [req.params.id]);
        if (agentRes.rows.length === 0) return res.status(404).json({ error: 'Agente no encontrado' });
        const agent = agentRes.rows[0];

        // Last 10 EOD reports
        const eodRes = await pool.query(
            'SELECT * FROM eod_reports WHERE agent_id = $1 ORDER BY date DESC LIMIT 10',
            [req.params.id]
        );
        agent.eod_reports = eodRes.rows;

        // Recent raw events (last 20)
        const eventsRes = await pool.query(
            'SELECT * FROM raw_events WHERE agent_id = $1 ORDER BY timestamp DESC LIMIT 20',
            [req.params.id]
        );
        agent.recent_events = eventsRes.rows;

        res.json(agent);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/agents/:id', async (req, res) => {
    try {
        const { status } = req.body;
        await pool.query('UPDATE agents SET status = $1, updated_at = NOW() WHERE id = $2', [status, req.params.id]);
        await logAudit('agent', null, `Agent ${req.params.id} status -> ${status}`, null, req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEPARTMENTS
// ═══════════════════════════════════════════════════════════════════════════════

const DEPT_META = {
    data: { name: 'Data', emoji: '📊', color: '#10b981', description: 'Extraccion, limpieza y normalizacion de datos de propiedades EAU' },
    dev: { name: 'Dev', emoji: '💻', color: '#06b6d4', description: 'Desarrollo de software, features y automatizacion' },
    content: { name: 'Content', emoji: '✍️', color: '#f59e0b', description: 'Fichas de propiedades, blog y descripciones SEO' },
    design: { name: 'Design', emoji: '🎨', color: '#6366f1', description: 'UI/UX, identidad visual y prototipos' },
    product: { name: 'Product', emoji: '🧭', color: '#a855f7', description: 'Gestion de producto, sprints y coordinacion de agentes' },
};

app.get('/api/departments', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT department,
                    count(*) as agent_count,
                    count(*) FILTER (WHERE status = 'active') as active_count
             FROM agents GROUP BY department ORDER BY department`
        );
        const departments = result.rows.map(row => ({
            id: row.department,
            ...DEPT_META[row.department] || { name: row.department, emoji: '📁', color: '#94a3b8', description: '' },
            agentCount: parseInt(row.agent_count),
            activeCount: parseInt(row.active_count),
        }));
        res.json(departments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/departments/:id', async (req, res) => {
    try {
        const deptId = req.params.id;
        const meta = DEPT_META[deptId] || { name: deptId, emoji: '📁', color: '#94a3b8', description: '' };

        const agentsRes = await pool.query(
            'SELECT * FROM agents WHERE department = $1 ORDER BY name', [deptId]
        );

        // Latest weekly for this dept
        const weeklyRes = await pool.query(
            'SELECT * FROM weekly_sessions WHERE department = $1 ORDER BY session_date DESC LIMIT 1', [deptId]
        );

        res.json({
            id: deptId,
            ...meta,
            agents: agentsRes.rows,
            latestWeekly: weeklyRes.rows[0] || null,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// WEEKLY SESSIONS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/weekly-sessions', async (req, res) => {
    try {
        const { department } = req.query;
        let query = `SELECT ws.*,
            (SELECT count(*) FROM weekly_brainstorms wb WHERE wb.weekly_session_id = ws.id) AS brainstorm_count
            FROM weekly_sessions ws`;
        const params = [];
        if (department) {
            query += ' WHERE ws.department = $1';
            params.push(department);
        }
        query += ' ORDER BY ws.session_date DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/weekly-sessions/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM weekly_sessions WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Weekly session not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/weekly-sessions', async (req, res) => {
    try {
        const { department, week_number, session_date, steps_data, final_projects } = req.body;
        const result = await pool.query(
            `INSERT INTO weekly_sessions (department, week_number, session_date, steps_data, final_projects)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [department, week_number, session_date || new Date(), JSON.stringify(steps_data || {}), JSON.stringify(final_projects || [])]
        );
        await logAudit('weekly', department, `Weekly W${week_number} creada: ${department}`, `Session date: ${session_date}`);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/weekly-sessions/:id', async (req, res) => {
    try {
        const { status, report } = req.body;
        const sets = [];
        const params = [];

        if (status !== undefined) { params.push(status); sets.push(`status = $${params.length}`); }
        if (report !== undefined) { params.push(JSON.stringify(report)); sets.push(`report = $${params.length}`); }

        if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

        sets.push('updated_at = NOW()');
        params.push(req.params.id);
        const result = await pool.query(
            `UPDATE weekly_sessions SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
            params
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Weekly session not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/weekly-sessions/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM weekly_sessions WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Weekly session not found' });
        await logAudit('weekly', result.rows[0].department, `Weekly W${result.rows[0].week_number} eliminada`, `Session ID: ${req.params.id}`);
        res.json({ deleted: true, session: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/weekly-sessions/:id/brainstorms', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT b.*, a.name as agent_name, a.role as agent_role, a.avatar as agent_avatar
             FROM weekly_brainstorms b
             JOIN agents a ON b.agent_id = a.id
             WHERE b.weekly_session_id = $1
             ORDER BY b.created_at ASC`,
            [req.params.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/weekly-sessions/:id/import-inbox', async (req, res) => {
    try {
        const sessionId = req.params.id;

        const sessionRes = await pool.query('SELECT * FROM weekly_sessions WHERE id = $1', [sessionId]);
        if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Weekly session not found' });
        const session = sessionRes.rows[0];

        // Find previous weekly for this department to get cutoff date
        const prevRes = await pool.query(
            `SELECT created_at FROM weekly_sessions
             WHERE department = $1 AND id != $2
             ORDER BY created_at DESC LIMIT 1`,
            [session.department, sessionId]
        );
        const since = prevRes.rows.length > 0
            ? prevRes.rows[0].created_at
            : new Date(0).toISOString();

        // Find eligible inbox items (case-insensitive department match)
        const inboxRes = await pool.query(
            `SELECT * FROM inbox_items
             WHERE LOWER(department) = LOWER($1)
               AND status IN ('borrador', 'chat')
               AND created_at > $2
             ORDER BY created_at DESC`,
            [session.department, since]
        );
        const inboxItems = inboxRes.rows.map(i => ({ ...i, _source: 'inbox' }));

        // Find pipeline projects for this department
        const projectsRes = await pool.query(
            `SELECT * FROM projects
             WHERE LOWER(department) = LOWER($1)
               AND status IN ('Planning', 'In Progress')
             ORDER BY updated_at DESC`,
            [session.department]
        );
        const pipelineItems = projectsRes.rows.map(p => ({ ...p, _source: 'pipeline' }));

        const allItems = [...inboxItems, ...pipelineItems];

        // Save snapshot
        await pool.query(
            `UPDATE weekly_sessions SET inbox_snapshot = $1, updated_at = NOW() WHERE id = $2`,
            [JSON.stringify(allItems), sessionId]
        );

        // Link inbox items to this session
        if (inboxItems.length > 0) {
            const ids = inboxItems.map(i => i.id);
            await pool.query(
                `UPDATE inbox_items SET weekly_session_id = $1, updated_at = NOW() WHERE id = ANY($2)`,
                [sessionId, ids]
            );
        }

        await logAudit('weekly', session.department,
            `Inbox importado: W${session.week_number}`,
            `${inboxItems.length} inbox + ${pipelineItems.length} proyectos importados`
        );
        res.json({ imported: allItems.length, items: allItems });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/weekly-sessions/:id/brainstorm', async (req, res) => {
    try {
        const sessionId = req.params.id;

        const sessionRes = await pool.query('SELECT * FROM weekly_sessions WHERE id = $1', [sessionId]);
        if (sessionRes.rows.length === 0) return res.status(404).json({ error: 'Weekly session not found' });
        const session = sessionRes.rows[0];

        const agentsRes = await pool.query(
            'SELECT * FROM agents WHERE department = $1 ORDER BY name',
            [session.department]
        );
        const agents = agentsRes.rows;
        if (agents.length === 0) return res.json({ contributions: [] });

        // Load inbox items for this session
        const inboxRes = await pool.query(
            'SELECT title, description, status FROM inbox_items WHERE weekly_session_id = $1',
            [sessionId]
        );
        const inboxItems = inboxRes.rows;

        // Extract pipeline projects from session snapshot
        const snapshot = Array.isArray(session.inbox_snapshot) ? session.inbox_snapshot : [];
        const pipelineProjects = snapshot.filter(i => i._source === 'pipeline');

        // Load EOD reports for last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const eodRes = await pool.query(
            `SELECT e.*, a.name as agent_name FROM eod_reports e
             JOIN agents a ON e.agent_id = a.id
             WHERE a.department = $1 AND e.date >= $2
             ORDER BY e.date DESC`,
            [session.department, sevenDaysAgo.toISOString().split('T')[0]]
        );

        const contributions = [];

        for (const agent of agents) {
            const agentEods = eodRes.rows.filter(r => r.agent_id === agent.id);

            const inboxContext = inboxItems.length > 0
                ? `\n\nIdeas en la agenda de esta semana:\n${inboxItems.map(i => `- ${i.title}: ${i.description || 'Sin descripcion'}`).join('\n')}`
                : '';

            const projectContext = pipelineProjects.length > 0
                ? `\n\nProyectos activos del departamento para esta semana:\n${pipelineProjects.map(p =>
                    `- **${p.name}**\n  Problema: ${p.problem || 'No definido'}\n  Solucion propuesta: ${p.solution || 'No definida'}\n  Metricas de exito: ${(Array.isArray(p.success_metrics) ? p.success_metrics : []).join(', ') || 'No definidas'}\n  Riesgos: ${(Array.isArray(p.risks) ? p.risks : []).join(', ') || 'Ninguno identificado'}\n  Status: ${p.status}`
                  ).join('\n\n')}`
                : '';

            const eodContext = agentEods.length > 0
                ? `\n\nTu trabajo reciente (ultimos 7 dias):\n${agentEods.map(e => {
                    const completed = Array.isArray(e.completed_tasks) ? e.completed_tasks : [];
                    const blockers = Array.isArray(e.blockers) ? e.blockers : [];
                    return `${e.date}: ${completed.length} tareas completadas${blockers.length > 0 ? `, bloqueado en: ${blockers.map(b => b.desc || b).join(', ')}` : ''}`;
                }).join('\n')}`
                : '';

            const hasProjects = pipelineProjects.length > 0;
            const systemPrompt = `Eres ${agent.name}, ${agent.role} en Emiralia.
Tu departamento es ${agent.department}.
Es lunes y tienes 2 minutos para dar tu contribucion en el Weekly Brainstorm.
${hasProjects
    ? `Hay proyectos activos en la agenda. Analiza cada uno desde tu perspectiva como ${agent.role} y aporta:
- Como puedes contribuir desde tu area especifica
- Riesgos o concerns que identificas
- Propuestas concretas de mejora o ejecucion
Referencia los proyectos por nombre. Se especifico y practico.`
    : `Propon UNA mejora, proyecto concreto o concern basado en tu trabajo reciente y las ideas de la semana.
Se especifico, practico y conciso.`}
Maximo 3 parrafos.
Clasifica tu contribucion como: proposal, improvement, concern, o insight.
Responde SOLO en el siguiente formato JSON:
{"contribution_type": "proposal|improvement|concern|insight", "content": "Tu propuesta aqui..."}`;

            try {
                const response = await anthropic.messages.create({
                    model: 'claude-sonnet-4-6',
                    max_tokens: 800,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: `Semana ${session.week_number}.${projectContext}${inboxContext}${eodContext}\n\n¿Cual es tu contribucion?` }],
                });

                const text = response.content[0].text;
                let parsed = null;
                try {
                    const jsonMatch = text.match(/\{[\s\S]+\}/);
                    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
                } catch { /* use raw text */ }

                const contributionType = parsed?.contribution_type || 'insight';
                const content = parsed?.content || text;

                const saved = await pool.query(
                    `INSERT INTO weekly_brainstorms
                     (weekly_session_id, agent_id, contribution_type, content, context)
                     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                    [sessionId, agent.id, contributionType, content,
                     JSON.stringify({ eod_count: agentEods.length, inbox_count: inboxItems.length })]
                );

                contributions.push({
                    ...saved.rows[0],
                    agent_name: agent.name,
                    agent_role: agent.role,
                    agent_avatar: agent.avatar,
                });
            } catch (agentErr) {
                console.error(`[Brainstorm] Error for agent ${agent.id}:`, agentErr.message);
            }
        }

        await logAudit('weekly', session.department,
            `Brainstorm W${session.week_number}`,
            `${contributions.length} contribuciones generadas`
        );
        res.json({ contributions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/weekly-sessions/:id/brainstorm/:bid/respond', async (req, res) => {
    try {
        const { bid, id: sessionId } = req.params;
        const { user_response, action } = req.body;

        const finalResponse = (action === 'accept_project' && !user_response)
            ? 'Aceptado como proyecto'
            : (user_response || '');

        const updateRes = await pool.query(
            `UPDATE weekly_brainstorms SET user_response = $1 WHERE id = $2 AND weekly_session_id = $3 RETURNING *`,
            [finalResponse, bid, sessionId]
        );
        if (updateRes.rows.length === 0) return res.status(404).json({ error: 'Contribution not found' });
        const contribution = updateRes.rows[0];

        let createdProject = null;

        if (action === 'accept_project') {
            const sessionRes = await pool.query(
                'SELECT department, week_number FROM weekly_sessions WHERE id = $1',
                [sessionId]
            );
            const session = sessionRes.rows[0];

            // Extract structured fields from brainstorm using Claude
            let extracted = {};
            try {
                const extraction = await anthropic.messages.create({
                    model: 'claude-sonnet-4-6',
                    max_tokens: 600,
                    system: 'Extrae campos estructurados de esta propuesta de brainstorm para crear un proyecto en Emiralia. Responde SOLO en JSON valido, sin markdown.',
                    messages: [{ role: 'user', content: `Propuesta del agente:\n${contribution.content}\n\nExtrae en JSON:\n{"name":"nombre corto del proyecto (max 60 chars)","problem":"problema que resuelve","solution":"solucion propuesta resumida","success_metrics":["metrica1","metrica2"],"requirements":["req1"],"risks":["riesgo1"]}` }],
                });
                const jsonMatch = extraction.content[0].text.match(/\{[\s\S]+\}/);
                if (jsonMatch) extracted = JSON.parse(jsonMatch[0]);
            } catch (aiErr) {
                console.error('[Accept Project] AI extraction failed:', aiErr.message);
            }

            const projRes = await pool.query(
                `INSERT INTO projects
                 (name, problem, solution, department, sub_area, status, blocks, success_metrics, pain_points, requirements, risks, estimated_budget, estimated_timeline, future_improvements)
                 VALUES ($1,$2,$3,$4,$5,'Planning','[]',$6,'[]',$7,$8,0,'TBD','[]') RETURNING *`,
                [
                    extracted.name || contribution.content.substring(0, 60),
                    extracted.problem || `Propuesta de brainstorm W${session.week_number}`,
                    extracted.solution || contribution.content,
                    session.department,
                    'General',
                    JSON.stringify(extracted.success_metrics || []),
                    JSON.stringify(extracted.requirements || []),
                    JSON.stringify(extracted.risks || []),
                ]
            );
            createdProject = projRes.rows[0];

            await logAudit('weekly', session.department,
                `Proyecto creado desde brainstorm W${session.week_number}`,
                `Project ID: ${createdProject.id}, Name: ${createdProject.name}`
            );
        }

        res.json({ contribution, createdProject });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Generate Smart Weekly Report ──
app.post('/api/weekly-sessions/:id/report', async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Load session
        const sessionResult = await pool.query('SELECT * FROM weekly_sessions WHERE id = $1', [id]);
        if (sessionResult.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
        const session = sessionResult.rows[0];
        const { department, week_number, session_date } = session;

        // 2. Date range: from previous session+1 day (or 7 days back) to session_date
        const prevSessionResult = await pool.query(
            `SELECT session_date, report FROM weekly_sessions
             WHERE department = $1 AND session_date < $2
             ORDER BY session_date DESC LIMIT 1`,
            [department, session_date]
        );
        const endDate = new Date(session_date).toISOString().split('T')[0];
        let startDate;
        if (prevSessionResult.rows.length > 0) {
            const prev = new Date(prevSessionResult.rows[0].session_date);
            prev.setDate(prev.getDate() + 1);
            startDate = prev.toISOString().split('T')[0];
        } else {
            const start = new Date(session_date);
            start.setDate(start.getDate() - 7);
            startDate = start.toISOString().split('T')[0];
        }

        // 3. Query EODs for department + date range
        const eodResult = await pool.query(
            `SELECT e.*, a.name as agent_name, a.role as agent_role
             FROM eod_reports e
             JOIN agents a ON e.agent_id = a.id
             WHERE a.department = $1 AND e.date >= $2 AND e.date <= $3`,
            [department, startDate, endDate]
        );
        const eods = eodResult.rows;

        // 4a. Tasks aggregation
        let totalCompleted = 0;
        let totalInProgress = 0;
        eods.forEach(e => {
            const completed = Array.isArray(e.completed_tasks) ? e.completed_tasks : [];
            const inProgress = Array.isArray(e.in_progress_tasks) ? e.in_progress_tasks : [];
            totalCompleted += completed.length;
            totalInProgress += inProgress.length;
        });
        const totalPlanned = totalCompleted + totalInProgress;
        const completionRate = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) / 100 : 0;
        const tasks = { completed: totalCompleted, in_progress: totalInProgress, planned: totalPlanned, rate: completionRate };

        // 4b. Blockers aggregation
        const allBlockers = [];
        eods.forEach(e => {
            const blockers = Array.isArray(e.blockers) ? e.blockers : [];
            blockers.forEach(b => {
                if (b && (b.description || b.desc || typeof b === 'string')) {
                    allBlockers.push({
                        description: b.description || b.desc || b,
                        agent: e.agent_name,
                        severity: b.severity || 'medium',
                        resolved: b.resolved || false,
                        date: e.date,
                    });
                }
            });
        });

        // 4c. Mood distribution
        const moodCounts = {};
        eods.forEach(e => {
            if (e.mood) moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
        });
        const positiveCount = (moodCounts.productive || 0) + (moodCounts.focused || 0) +
            (moodCounts.energized || 0) + (moodCounts.motivated || 0) +
            (moodCounts.creative || 0) + (moodCounts.strategic || 0);
        const blockedCount = moodCounts.blocked || 0;
        const moodTrend = blockedCount === 0 ? 'positivo'
            : positiveCount > blockedCount * 2 ? 'estable' : 'con_friccion';
        const mood = { ...moodCounts, trend: moodTrend };

        // 5. Brainstorm contributions
        const brainstormResult = await pool.query(
            `SELECT contribution_type, user_response FROM weekly_brainstorms WHERE weekly_session_id = $1`,
            [id]
        );
        const contributions = brainstormResult.rows;
        const typeMap = {};
        contributions.forEach(c => {
            if (c.contribution_type) typeMap[c.contribution_type] = (typeMap[c.contribution_type] || 0) + 1;
        });
        const accepted = contributions.filter(c => c.user_response && c.user_response.trim().length > 0).length;
        const brainstorm_summary = { total: contributions.length, accepted, types: typeMap };

        // 6. Inbox snapshot
        const inboxItems = Array.isArray(session.inbox_snapshot) ? session.inbox_snapshot : [];
        const inbox = {
            total: inboxItems.length,
            by_status: inboxItems.reduce((acc, item) => {
                const s = item.status || 'chat';
                acc[s] = (acc[s] || 0) + 1;
                return acc;
            }, {}),
        };

        // 7. Department KPIs
        let kpis = {};
        if (department === 'data') {
            try {
                const kpiResult = await pool.query(
                    `SELECT COUNT(*) as count FROM raw_events
                     WHERE created_at::date >= $1 AND created_at::date <= $2`,
                    [startDate, endDate]
                );
                kpis.properties_scraped = parseInt(kpiResult.rows[0]?.count) || 0;
            } catch { kpis.properties_scraped = null; }
        }

        // 8. Previous week comparison
        let vs_last_week = null;
        const prevReport = prevSessionResult.rows[0]?.report;
        if (prevReport && prevReport.tasks) {
            vs_last_week = {
                tasks_delta: totalCompleted - (prevReport.tasks.completed || 0),
                blockers_delta: allBlockers.length - (Array.isArray(prevReport.blockers) ? prevReport.blockers.length : 0),
                mood_trend: moodTrend,
            };
        }

        // 9. Assemble & save report
        const report = {
            period: { week: week_number, start: startDate, end: endDate },
            tasks, blockers: allBlockers, mood, kpis,
            brainstorm_summary, inbox, vs_last_week,
            generated_at: new Date().toISOString(),
        };

        await pool.query(
            'UPDATE weekly_sessions SET report = $1, updated_at = NOW() WHERE id = $2',
            [JSON.stringify(report), id]
        );

        res.json({ report });
    } catch (err) {
        console.error('Error generating weekly report:', err);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// EOD REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/eod-reports', async (req, res) => {
    try {
        const { department, date, from, to } = req.query;
        let query = `
            SELECT r.*, a.name as agent_name, a.avatar, a.department, a.role
            FROM eod_reports r
            JOIN agents a ON r.agent_id = a.id
        `;
        const conditions = [];
        const params = [];

        if (department) {
            params.push(department);
            conditions.push(`a.department = $${params.length}`);
        }
        if (date) {
            params.push(date);
            conditions.push(`r.date = $${params.length}`);
        }
        if (!date && from) {
            params.push(from);
            conditions.push(`r.date >= $${params.length}`);
        }
        if (!date && to) {
            params.push(to);
            conditions.push(`r.date <= $${params.length}`);
        }
        if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
        query += ' ORDER BY r.date DESC, a.name';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/eod-reports/coverage', async (req, res) => {
    try {
        const { department, date } = req.query;
        if (!department) return res.status(400).json({ error: 'department is required' });
        const targetDate = date || new Date().toISOString().split('T')[0];
        const result = await pool.query(`
            SELECT a.id, a.name, a.avatar, a.role,
                   r.id AS report_id, r.mood,
                   COALESCE(jsonb_array_length(r.completed_tasks), 0) AS completed_count,
                   COALESCE(jsonb_array_length(r.blockers), 0) AS blocker_count
            FROM agents a
            LEFT JOIN eod_reports r ON r.agent_id = a.id AND r.date = $2
            WHERE a.department = $1 AND a.status != 'offline'
            ORDER BY a.name
        `, [department, targetDate]);
        const total = result.rows.length;
        const reported = result.rows.filter(r => r.report_id !== null).length;
        res.json({ total, reported, coverage: total > 0 ? Math.round((reported / total) * 100) : 0, agents: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/eod-reports/trends', async (req, res) => {
    try {
        const { department, days } = req.query;
        if (!department) return res.status(400).json({ error: 'department is required' });
        const numDays = parseInt(days) || 14;

        const result = await pool.query(`
            SELECT r.date::text,
                   COUNT(*)::int AS report_count,
                   COALESCE(SUM(jsonb_array_length(r.completed_tasks)), 0)::int AS completed_count,
                   COALESCE(SUM(jsonb_array_length(r.blockers)), 0)::int AS blocker_count,
                   COALESCE(SUM(jsonb_array_length(r.in_progress_tasks)), 0)::int AS wip_count
            FROM eod_reports r
            JOIN agents a ON r.agent_id = a.id
            WHERE a.department = $1 AND r.date >= CURRENT_DATE - $2::int
            GROUP BY r.date
            ORDER BY r.date ASC
        `, [department, numDays]);

        // Mood distribution for the period
        const moodResult = await pool.query(`
            SELECT r.mood, COUNT(*)::int AS count
            FROM eod_reports r
            JOIN agents a ON r.agent_id = a.id
            WHERE a.department = $1 AND r.date >= CURRENT_DATE - $2::int AND r.mood IS NOT NULL
            GROUP BY r.mood
            ORDER BY count DESC
        `, [department, numDays]);

        res.json({ daily: result.rows, moodDistribution: moodResult.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/eod-reports/agent/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM eod_reports WHERE agent_id = $1 ORDER BY date DESC LIMIT 30',
            [req.params.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/eod-reports', async (req, res) => {
    try {
        const { agent_id, date, completed_tasks, in_progress_tasks, blockers, insights, plan_tomorrow, mood } = req.body;
        const result = await pool.query(
            `INSERT INTO eod_reports (agent_id, date, completed_tasks, in_progress_tasks, blockers, insights, plan_tomorrow, mood)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (agent_id, date) DO UPDATE
             SET completed_tasks = EXCLUDED.completed_tasks, in_progress_tasks = EXCLUDED.in_progress_tasks,
                 blockers = EXCLUDED.blockers, insights = EXCLUDED.insights,
                 plan_tomorrow = EXCLUDED.plan_tomorrow, mood = EXCLUDED.mood
             RETURNING *`,
            [agent_id, date || new Date().toISOString().split('T')[0],
             JSON.stringify(completed_tasks || []), JSON.stringify(in_progress_tasks || []),
             JSON.stringify(blockers || []), JSON.stringify(insights || []),
             JSON.stringify(plan_tomorrow || []), mood || 'neutral']
        );
        await logAudit('eod', null, `EOD report: ${agent_id}`, `Date: ${date}`, agent_id);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/raw-events', async (req, res) => {
    try {
        const { agent_id, event_type, content } = req.body;
        if (!agent_id || !event_type) return res.status(400).json({ error: 'agent_id and event_type required' });
        const result = await pool.query(
            'INSERT INTO raw_events (agent_id, event_type, content) VALUES ($1, $2, $3) RETURNING id, timestamp',
            [agent_id, event_type, JSON.stringify(content || {})]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/eod-reports/generate-department', async (req, res) => {
    try {
        const { department, date } = req.body;
        if (!department) return res.status(400).json({ error: 'department is required' });
        const targetDate = date || new Date().toISOString().split('T')[0];

        // Find agents with raw_events on that date but no report yet
        const agentsWithEvents = await pool.query(`
            SELECT DISTINCT a.id FROM agents a
            JOIN raw_events re ON re.agent_id = a.id
            LEFT JOIN eod_reports r ON r.agent_id = a.id AND r.date = $2
            WHERE a.department = $1 AND a.status != 'offline'
              AND re.timestamp::date = $2::date
              AND r.id IS NULL
        `, [department, targetDate]);

        const generated = [];
        for (const { id } of agentsWithEvents.rows) {
            const report = await generateEodReport(id, targetDate, pool);
            if (report) generated.push(id);
        }

        await logAudit('daily', department, `EODs auto-generated: ${department}`, `Generated ${generated.length} reports for ${targetDate}`);
        res.json({ generated: generated.length, agents: generated, date: targetDate });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/eod-reports/summarize', async (req, res) => {
    try {
        const { department, date } = req.body;
        if (!department) return res.status(400).json({ error: 'department is required' });
        const targetDate = date || new Date().toISOString().split('T')[0];

        const reportsRes = await pool.query(`
            SELECT r.*, a.name as agent_name, a.role
            FROM eod_reports r
            JOIN agents a ON r.agent_id = a.id
            WHERE a.department = $1 AND r.date = $2
            ORDER BY a.name
        `, [department, targetDate]);

        if (reportsRes.rows.length === 0) {
            return res.json({ summary: 'No hay reportes EOD para esta fecha.', date: targetDate, department });
        }

        // Build context
        let context = `Daily Standup — Departamento: ${department} — Fecha: ${targetDate}\n\n`;
        for (const r of reportsRes.rows) {
            context += `## ${r.agent_name} (${r.role}) — Mood: ${r.mood || 'N/A'}\n`;
            const completed = r.completed_tasks || [];
            const blockers = r.blockers || [];
            const wip = r.in_progress_tasks || [];
            const insights = r.insights || [];
            const plan = r.plan_tomorrow || [];
            if (completed.length > 0) context += `Completado: ${completed.map(t => t.desc).join('; ')}\n`;
            if (wip.length > 0) context += `En progreso: ${wip.map(t => `${t.desc} (${t.pct || '?'}%)`).join('; ')}\n`;
            if (blockers.length > 0) context += `Blockers: ${blockers.map(b => `${b.desc} [${b.severity}]`).join('; ')}\n`;
            if (insights.length > 0) context += `Insights: ${insights.join('; ')}\n`;
            if (plan.length > 0) context += `Plan manana: ${plan.join('; ')}\n`;
            context += '\n';
        }

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: `Eres el PM Agent de Emiralia. Genera un resumen ejecutivo del Daily Standup en español.
Formato:
- Resumen general (2-3 lineas)
- Logros clave (bullet points)
- Blockers activos (bullet points con severidad)
- Estado del equipo (mood general, quien necesita apoyo)
- Prioridades para manana
Se conciso y directo. Usa emojis sparingly.`,
            messages: [{ role: 'user', content: context }],
        });

        const summary = message.content[0].text;
        await logAudit('daily', department, `AI Standup Summary: ${department}`, `Generated for ${targetDate}`);
        res.json({ summary, date: targetDate, department });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/audit-events', async (req, res) => {
    try {
        const { department, type, limit: lim } = req.query;
        let query = 'SELECT * FROM audit_log';
        const conditions = [];
        const params = [];

        if (department && department !== 'all') {
            params.push(department);
            conditions.push(`department = $${params.length}`);
        }
        if (type && type !== 'all') {
            params.push(type);
            conditions.push(`event_type = $${params.length}`);
        }
        if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
        query += ' ORDER BY date DESC';
        query += ` LIMIT ${parseInt(lim) || 50}`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTELLIGENCE
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/intelligence/summary', async (req, res) => {
    try {
        const agentCount = await pool.query('SELECT count(*) FROM agents');
        const activeCount = await pool.query("SELECT count(*) FROM agents WHERE status = 'active'");
        const todayReports = await pool.query("SELECT count(*) FROM eod_reports WHERE date = CURRENT_DATE");
        const totalEvents = await pool.query('SELECT count(*) FROM raw_events');
        const recentAudit = await pool.query('SELECT count(*) FROM audit_log WHERE date > NOW() - interval \'7 days\'');

        // Blockers across all departments today
        const blockersRes = await pool.query(
            `SELECT r.blockers, a.department, a.name
             FROM eod_reports r JOIN agents a ON r.agent_id = a.id
             WHERE r.date = CURRENT_DATE AND r.blockers != '[]'::jsonb`
        );

        res.json({
            agents: { total: parseInt(agentCount.rows[0].count), active: parseInt(activeCount.rows[0].count) },
            today: { eodReports: parseInt(todayReports.rows[0].count) },
            totals: { rawEvents: parseInt(totalEvents.rows[0].count), auditEventsWeek: parseInt(recentAudit.rows[0].count) },
            todayBlockers: blockersRes.rows,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PM REPORTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/pm-reports', async (req, res) => {
    try {
        const { limit: lim } = req.query;
        const result = await pool.query(
            `SELECT * FROM pm_reports ORDER BY created_at DESC LIMIT $1`,
            [parseInt(lim) || 50]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/pm-reports/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pm_reports WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Reporte no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/pm-reports', async (req, res) => {
    try {
        const { title, summary, body_md, metrics, risks, next_steps } = req.body;
        const result = await pool.query(
            `INSERT INTO pm_reports (title, summary, body_md, metrics, risks, next_steps)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [title, summary, body_md, JSON.stringify(metrics || {}), JSON.stringify(risks || []), JSON.stringify(next_steps || [])]
        );
        await logAudit('pm_report', 'product', `PM Report: ${title}`, summary);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/pm-reports/generate', async (req, res) => {
    try {
        // Gather live metrics from the database
        const [
            agentCount, activeAgents, propertyCount, projectCount,
            eodCount, weeklyCount, raiseCount, auditWeek, eventCount, memoryCount
        ] = await Promise.all([
            pool.query('SELECT count(*) FROM agents'),
            pool.query("SELECT count(*) FROM agents WHERE status = 'active'"),
            pool.query('SELECT count(*) FROM properties'),
            pool.query('SELECT count(*) FROM projects'),
            pool.query('SELECT count(*) FROM eod_reports'),
            pool.query('SELECT count(*) FROM weekly_sessions'),
            pool.query("SELECT count(*) FROM collaboration_raises WHERE status != 'resolved'"),
            pool.query("SELECT count(*) FROM audit_log WHERE date > NOW() - interval '7 days'"),
            pool.query('SELECT count(*) FROM raw_events'),
            pool.query('SELECT count(*) FROM agent_memory'),
        ]);

        const prevReport = await pool.query('SELECT * FROM pm_reports ORDER BY created_at DESC LIMIT 1');

        const metrics = {
            agentes_total: parseInt(agentCount.rows[0].count),
            agentes_activos: parseInt(activeAgents.rows[0].count),
            propiedades: parseInt(propertyCount.rows[0].count),
            proyectos: parseInt(projectCount.rows[0].count),
            eod_reports: parseInt(eodCount.rows[0].count),
            weekly_sessions: parseInt(weeklyCount.rows[0].count),
            raises_activos: parseInt(raiseCount.rows[0].count),
            eventos_audit_semana: parseInt(auditWeek.rows[0].count),
            raw_events: parseInt(eventCount.rows[0].count),
            memorias_agente: parseInt(memoryCount.rows[0].count),
        };

        // Detect blockers from today's EODs
        const blockersRes = await pool.query(
            `SELECT r.blockers, a.name, a.department
             FROM eod_reports r JOIN agents a ON r.agent_id = a.id
             WHERE r.date = CURRENT_DATE AND r.blockers != '[]'::jsonb`
        );

        // Build risks from live data
        const risks = [];
        if (metrics.raises_activos > 0) {
            risks.push({ risk: `${metrics.raises_activos} raises de colaboracion sin resolver`, severity: 'ALTA', mitigation: 'Revisar en Collaboration Hub' });
        }
        if (blockersRes.rows.length > 0) {
            const blockerAgents = blockersRes.rows.map(b => b.name).join(', ');
            risks.push({ risk: `Blockers activos hoy: ${blockerAgents}`, severity: 'ALTA', mitigation: 'Revisar Daily Standup' });
        }
        if (metrics.propiedades === 0) {
            risks.push({ risk: 'Sin propiedades en la base de datos', severity: 'MEDIA', mitigation: 'Ejecutar scraper de PropertyFinder' });
        }

        // Build next steps
        const nextSteps = [];
        if (metrics.propiedades === 0) {
            nextSteps.push({ action: 'Ejecutar scraper para poblar la DB de propiedades', priority: 'ALTA' });
        }
        if (metrics.raises_activos > 0) {
            nextSteps.push({ action: 'Resolver raises de colaboracion pendientes', priority: 'ALTA' });
        }
        if (metrics.eod_reports === 0) {
            nextSteps.push({ action: 'Generar primeros EOD reports para los agentes activos', priority: 'MEDIA' });
        }

        const now = new Date();
        const dateStr = now.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
        const title = `Reporte Automatico — ${dateStr}`;

        const summaryParts = [
            `${metrics.agentes_activos}/${metrics.agentes_total} agentes activos`,
            `${metrics.propiedades} propiedades`,
            `${metrics.proyectos} proyectos`,
            `${metrics.raises_activos} raises pendientes`,
        ];
        const summary = `Estado del sistema: ${summaryParts.join(' | ')}`;

        // Compare with previous report
        let deltaText = '';
        if (prevReport.rows.length > 0) {
            const prev = prevReport.rows[0].metrics || {};
            const deltas = Object.keys(metrics)
                .map(k => {
                    const cur = metrics[k];
                    const p = typeof prev[k] === 'number' ? prev[k] : parseInt(prev[k]);
                    if (isNaN(p) || cur === p) return null;
                    const diff = cur - p;
                    return `${k}: ${diff > 0 ? '+' : ''}${diff}`;
                })
                .filter(Boolean);
            if (deltas.length > 0) deltaText = `\n\nCambios vs reporte anterior:\n${deltas.join('\n')}`;
        }

        const body_md = `# ${title}\n\n${summary}${deltaText}\n\nGenerado automaticamente desde el Dashboard.`;

        const result = await pool.query(
            `INSERT INTO pm_reports (title, summary, body_md, metrics, risks, next_steps)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [title, summary, body_md, JSON.stringify(metrics), JSON.stringify(risks), JSON.stringify(nextSteps)]
        );
        await logAudit('pm_report', 'product', `PM Report generado: ${title}`, summary);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/pm-reports/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM pm_reports WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INBOX
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/inbox', async (req, res) => {
    try {
        const { department, status, since } = req.query;
        let query = 'SELECT * FROM inbox_items';
        const conditions = [];
        const params = [];

        if (department) {
            params.push(department);
            conditions.push(`department = $${params.length}`);
        }
        if (status) {
            params.push(status);
            conditions.push(`status = $${params.length}`);
        }
        if (since) {
            params.push(since);
            conditions.push(`created_at >= $${params.length}`);
        }
        if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/inbox/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM inbox_items WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Inbox item no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/inbox', async (req, res) => {
    try {
        const { title, description, department } = req.body;
        const result = await pool.query(
            `INSERT INTO inbox_items (title, description, source, department, status)
             VALUES ($1, $2, 'dashboard', $3, 'chat') RETURNING *`,
            [title || 'Nueva idea', description || '', department || null]
        );
        await logAudit('inbox', department || 'general', `Inbox item creado: ${title}`, 'Creado desde dashboard');
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/inbox/:id', async (req, res) => {
    try {
        const { status, department, project_id, structured_data } = req.body;
        const sets = [];
        const params = [];

        if (status !== undefined) { params.push(status); sets.push(`status = $${params.length}`); }
        if (department !== undefined) { params.push(department); sets.push(`department = $${params.length}`); }
        if (project_id !== undefined) { params.push(project_id); sets.push(`project_id = $${params.length}`); }
        if (structured_data !== undefined) { params.push(JSON.stringify(structured_data)); sets.push(`structured_data = $${params.length}`); }

        if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

        sets.push('updated_at = NOW()');
        params.push(req.params.id);
        const result = await pool.query(
            `UPDATE inbox_items SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
            params
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Inbox item no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/inbox/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM inbox_items WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PM AGENT CHAT (SSE)
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/chat/pm-agent', async (req, res) => {
    try {
        const { inbox_item_id, message } = req.body;
        if (!message) return res.status(400).json({ error: 'Message is required' });

        // Load or create inbox item
        let item;
        if (inbox_item_id) {
            const itemRes = await pool.query('SELECT * FROM inbox_items WHERE id = $1', [inbox_item_id]);
            if (itemRes.rows.length === 0) return res.status(404).json({ error: 'Inbox item no encontrado' });
            item = itemRes.rows[0];
        } else {
            const newItem = await pool.query(
                `INSERT INTO inbox_items (title, source, status) VALUES ($1, 'dashboard', 'chat') RETURNING *`,
                [message ? message.substring(0, 80) : 'Nueva idea']
            );
            item = newItem.rows[0];
        }

        // Build conversation history + fetch project context in parallel
        const conversation = Array.isArray(item.conversation) ? [...item.conversation] : [];
        conversation.push({ role: 'user', content: message });

        const apiMessages = conversation.map(m => ({ role: m.role, content: m.content }));
        const projectContext = await buildProjectContext(pool);

        // SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Inbox-Item-Id', item.id.toString());
        res.flushHeaders();

        // Stream response
        let fullResponse = '';
        const stream = await chatWithPMAgent(apiMessages, { stream: true, projectContext });

        stream.on('text', (text) => {
            fullResponse += text;
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
        });

        let streamEnded = false;

        stream.on('error', (err) => {
            if (!streamEnded) {
                streamEnded = true;
                res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
            }
        });

        await stream.finalMessage();

        // Persist conversation — status stays as 'chat', no auto-advance
        conversation.push({ role: 'assistant', content: fullResponse });

        await pool.query(
            `UPDATE inbox_items SET conversation = $1, updated_at = NOW() WHERE id = $2`,
            [JSON.stringify(conversation), item.id]
        );

        if (!streamEnded) {
            streamEnded = true;
            res.write('data: [DONE]\n\n');
            res.end();
        }
    } catch (err) {
        if (res.headersSent && !res.writableEnded) {
            res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        } else if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        }
    }
});

// ─── POST /api/agents/:agentId/chat ───────────────────────────────────────────
// Generic multi-agent chat endpoint (supports all 9 agents)
app.post('/api/agents/:agentId/chat', async (req, res) => {
    try {
        const { agentId } = req.params;
        const { message, userId = 'dashboard-user' } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Validate agentId exists
        const validAgents = ['pm-agent', 'data-agent', 'content-agent', 'translation-agent',
                             'frontend-agent', 'dev-agent', 'marketing-agent', 'research-agent',
                             'wat-auditor-agent'];
        if (!validAgents.includes(agentId)) {
            return res.status(404).json({ error: `Agent '${agentId}' not found` });
        }

        // Load conversation history from agent_conversations
        const conversation = await getConversation(userId, agentId, 'dashboard');
        const messages = conversation ? conversation.messages : [];

        // Add user message
        messages.push({ role: 'user', content: message });

        // Build agent context (includes system prompt, memory, recent events)
        const context = await buildAgentContext(agentId, 'dashboard');

        // SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Agent-Id', agentId);
        res.flushHeaders();

        // Call Claude API with streaming
        let fullResponse = '';
        const stream = await anthropic.messages.stream({
            model: context.model || 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: context.systemPrompt,
            messages: messages,
        });

        stream.on('text', (text) => {
            fullResponse += text;
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
        });

        let streamEnded = false;

        stream.on('error', (err) => {
            if (!streamEnded) {
                streamEnded = true;
                console.error('[AgentChat] Stream error:', err);
                res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
            }
        });

        await stream.finalMessage();

        // Save conversation to agent_conversations
        messages.push({ role: 'assistant', content: fullResponse });
        await saveConversation(userId, agentId, 'dashboard', messages);

        // Log event
        await logEvent(agentId, EVENT_TYPES.MESSAGE_SENT, {
            user_id: userId,
            channel: 'dashboard',
            message_preview: message.substring(0, 100)
        });

        if (!streamEnded) {
            streamEnded = true;
            res.write('data: [DONE]\n\n');
            res.end();
        }
    } catch (err) {
        console.error('[AgentChat] Error:', err);
        if (res.headersSent && !res.writableEnded) {
            res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        } else if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        }
    }
});

// ─── GET /api/agents/:agentId/conversation ────────────────────────────────────
// Load conversation history for an agent
app.get('/api/agents/:agentId/conversation', async (req, res) => {
    try {
        const { agentId } = req.params;
        const userId = req.query.userId || 'dashboard-user';

        const conversation = await getConversation(userId, agentId, 'dashboard');

        if (!conversation) {
            return res.json({ messages: [] });
        }

        // Return last 50 messages to avoid overwhelming the UI
        const messages = conversation.messages.slice(-50);

        res.json({
            messages,
            agentId: conversation.agent_id,
            createdAt: conversation.created_at,
            lastMessageAt: conversation.last_message_at
        });
    } catch (err) {
        console.error('[AgentChat] Error loading conversation:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/inbox/:id/to-borrador ─────────────────────────────────────────
app.post('/api/inbox/:id/to-borrador', async (req, res) => {
    try {
        const item = await pool.query('SELECT * FROM inbox_items WHERE id = $1', [req.params.id]);
        if (item.rows.length === 0) return res.status(404).json({ error: 'Not found' });

        const { conversation, status } = item.rows[0];
        if (status !== 'chat') {
            return res.status(400).json({ error: `Cannot create borrador from status '${status}'` });
        }
        if (!conversation || conversation.length === 0) {
            return res.status(400).json({ error: 'No conversation to summarize' });
        }

        console.log(`[to-borrador] Generating summary for item ${req.params.id} (${conversation.length} messages)...`);
        const summary = await generateSummary(conversation);
        console.log(`[to-borrador] Summary generated: ${summary.substring(0, 100)}...`);

        await pool.query(
            `UPDATE inbox_items
             SET summary = $1, conversation = '[]'::jsonb, status = 'borrador', updated_at = NOW()
             WHERE id = $2`,
            [summary, req.params.id]
        );

        res.json({ id: parseInt(req.params.id), status: 'borrador', summary });
    } catch (err) {
        console.error('[to-borrador] Error:', err);
        res.status(500).json({ error: err.message || 'Unknown error' });
    }
});

// ─── POST /api/inbox/:id/to-proyecto ──────────────────────────────────────────
app.post('/api/inbox/:id/to-proyecto', async (req, res) => {
    try {
        const item = await pool.query('SELECT * FROM inbox_items WHERE id = $1', [req.params.id]);
        if (item.rows.length === 0) return res.status(404).json({ error: 'Not found' });

        const { title, summary, status } = item.rows[0];
        if (status !== 'borrador') {
            return res.status(400).json({ error: `Cannot create project from status '${status}'` });
        }
        if (!summary) {
            return res.status(400).json({ error: 'No summary available' });
        }

        const projectContext = await buildProjectContext(pool);
        const { text, json: projectData } = await generateProject(title, summary, projectContext);

        if (!projectData) {
            return res.status(500).json({ error: 'PM Agent did not generate valid project JSON', response: text });
        }

        const projectId = await saveProject(projectData);

        await pool.query(
            `UPDATE inbox_items
             SET structured_data = $1, project_id = $2, status = 'proyecto', updated_at = NOW()
             WHERE id = $3`,
            [JSON.stringify(projectData), projectId, req.params.id]
        );

        res.json({ id: parseInt(req.params.id), status: 'proyecto', project_id: projectId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/inbox/:id/reopen ───────────────────────────────────────────────
app.post('/api/inbox/:id/reopen', async (req, res) => {
    try {
        const item = await pool.query('SELECT * FROM inbox_items WHERE id = $1', [req.params.id]);
        if (item.rows.length === 0) return res.status(404).json({ error: 'Not found' });

        const { status, summary } = item.rows[0];
        if (status !== 'borrador') {
            return res.status(400).json({ error: `Cannot reopen from status '${status}'` });
        }

        const seedConversation = [
            { role: 'user', content: `Contexto previo (borrador anterior):\n${summary}\n\nQuiero seguir refinando esta idea.` }
        ];

        await pool.query(
            `UPDATE inbox_items
             SET status = 'chat', conversation = $1, updated_at = NOW()
             WHERE id = $2`,
            [JSON.stringify(seedConversation), req.params.id]
        );

        res.json({ id: parseInt(req.params.id), status: 'chat' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// WORKFLOWS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/workflows/stats — totals: runs, completed, failed, active, last_run_at
app.get('/api/workflows/stats', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                COUNT(*)::int AS total_runs,
                COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
                COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
                COUNT(*) FILTER (WHERE status = 'running')::int AS active,
                MAX(started_at) AS last_run_at
            FROM workflow_runs
        `);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/workflows/runs — list runs, optional filters: workflow_id, status, limit
app.get('/api/workflows/runs', async (req, res) => {
    try {
        const { workflow_id, status, limit } = req.query;
        let query = 'SELECT * FROM workflow_runs WHERE 1=1';
        const params = [];

        if (workflow_id) {
            params.push(workflow_id);
            query += ` AND workflow_id = $${params.length}`;
        }
        if (status) {
            params.push(status);
            query += ` AND status = $${params.length}`;
        }

        query += ' ORDER BY started_at DESC';

        const lim = parseInt(limit) || 50;
        params.push(lim);
        query += ` LIMIT $${params.length}`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/workflows/runs — create a run
app.post('/api/workflows/runs', async (req, res) => {
    try {
        const { workflow_id, triggered_by = 'user' } = req.body;
        if (!workflow_id) return res.status(400).json({ error: 'workflow_id required' });

        if (workflow_id === 'scrape-propertyfinder') {
            // Automatable: spawn the scraper process
            const result = await pool.query(
                `INSERT INTO workflow_runs (workflow_id, status, triggered_by)
                 VALUES ($1, 'running', $2) RETURNING *`,
                [workflow_id, triggered_by]
            );
            const run = result.rows[0];

            // Spawn child process
            const { exec } = await import('child_process');
            const cwd = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
            const child = exec('node tools/apify_propertyfinder.js --monitoring --incremental', {
                cwd,
                timeout: 15 * 60 * 1000,
            });

            let stdout = '';
            let stderr = '';
            child.stdout?.on('data', (d) => (stdout += d));
            child.stderr?.on('data', (d) => (stderr += d));

            child.on('close', async (code) => {
                const completedAt = new Date();
                const durationMs = completedAt - new Date(run.started_at);
                const status = code === 0 ? 'completed' : 'failed';
                await pool.query(
                    `UPDATE workflow_runs
                     SET status = $1, completed_at = $2, duration_ms = $3,
                         output_summary = $4, error = $5
                     WHERE id = $6`,
                    [status, completedAt, durationMs, stdout.slice(-500), stderr.slice(-500) || null, run.id]
                );
            });

            res.json(run);
        } else {
            // Manual workflow: create as pending
            const result = await pool.query(
                `INSERT INTO workflow_runs (workflow_id, status, triggered_by)
                 VALUES ($1, 'pending', $2) RETURNING *`,
                [workflow_id, triggered_by]
            );
            res.json(result.rows[0]);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/workflows/runs/:id — update run status manually
app.patch('/api/workflows/runs/:id', async (req, res) => {
    try {
        const { status, output_summary, error: errorMsg } = req.body;
        const fields = [];
        const params = [];

        if (status) {
            params.push(status);
            fields.push(`status = $${params.length}`);
            if (status === 'completed' || status === 'failed') {
                fields.push(`completed_at = NOW()`);
                fields.push(`duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at))::int * 1000`);
            }
        }
        if (output_summary !== undefined) {
            params.push(output_summary);
            fields.push(`output_summary = $${params.length}`);
        }
        if (errorMsg !== undefined) {
            params.push(errorMsg);
            fields.push(`error = $${params.length}`);
        }

        if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

        params.push(req.params.id);
        const result = await pool.query(
            `UPDATE workflow_runs SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
            params
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Run not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SKILL USAGE TRACKER
// ═══════════════════════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SKILLS_DIR = path.resolve(__dirname, '../../.claude/skills');

// ─── Skill Registry (filesystem read with cache) ─────────────────────────────

let skillRegistryCache = null;
let skillRegistryCacheTime = 0;
const CACHE_TTL_MS = 60000;

function parseSkillRegistry() {
    const now = Date.now();
    if (skillRegistryCache && (now - skillRegistryCacheTime) < CACHE_TTL_MS) {
        return skillRegistryCache;
    }

    const skills = [];
    try {
        const domains = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
            .filter(d => d.isDirectory());

        for (const domain of domains) {
            const domainPath = path.join(SKILLS_DIR, domain.name);
            const skillDirs = fs.readdirSync(domainPath, { withFileTypes: true })
                .filter(d => d.isDirectory());

            for (const skillDir of skillDirs) {
                const skillFile = path.join(domainPath, skillDir.name, 'SKILL.md');
                if (!fs.existsSync(skillFile)) continue;

                const content = fs.readFileSync(skillFile, 'utf-8');
                const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
                const meta = { name: skillDir.name, domain: domain.name };

                if (fmMatch) {
                    const fm = fmMatch[1];
                    const descMatch = fm.match(/description:\s*(.+)/);
                    const hintMatch = fm.match(/argument-hint:\s*(.+)/);
                    if (descMatch) meta.description = descMatch[1].trim();
                    if (hintMatch) meta.argument_hint = hintMatch[1].trim();
                }

                skills.push(meta);
            }
        }
    } catch (err) {
        console.error('[SkillRegistry] Error reading skills directory:', err.message);
    }

    skillRegistryCache = skills;
    skillRegistryCacheTime = now;
    return skills;
}

app.get('/api/skills/registry', (req, res) => {
    try {
        const skills = parseSkillRegistry();
        res.json(skills);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Skill Stats Summary ─────────────────────────────────────────────────────

app.get('/api/skills/stats', async (req, res) => {
    try {
        const days = parseInt(req.query.days || '30', 10);
        const result = await pool.query(`
            SELECT
                COUNT(*)::int as total_invocations,
                COUNT(DISTINCT content->>'skill_name')::int as unique_skills,
                COUNT(*) FILTER (WHERE content->>'status' = 'completed')::int as successes,
                COUNT(*) FILTER (WHERE content->>'status' = 'failed')::int as failures,
                ROUND(AVG((content->>'duration_ms')::numeric))::int as avg_duration_ms
            FROM raw_events
            WHERE event_type = 'skill_invocation'
              AND timestamp > NOW() - make_interval(days => $1)
        `, [days]);

        const row = result.rows[0];
        const successRate = row.total_invocations > 0
            ? Math.round((row.successes / row.total_invocations) * 100)
            : 0;

        res.json({ ...row, success_rate: successRate });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Top Skills ──────────────────────────────────────────────────────────────

app.get('/api/skills/top', async (req, res) => {
    try {
        const days = parseInt(req.query.days || '30', 10);
        const limit = parseInt(req.query.limit || '10', 10);
        const result = await pool.query(`
            SELECT
                content->>'skill_name' as skill_name,
                content->>'skill_domain' as skill_domain,
                COUNT(*)::int as invocation_count,
                COUNT(*) FILTER (WHERE content->>'status' = 'completed')::int as success_count,
                ROUND(AVG((content->>'duration_ms')::numeric))::int as avg_duration_ms
            FROM raw_events
            WHERE event_type = 'skill_invocation'
              AND timestamp > NOW() - make_interval(days => $1)
            GROUP BY content->>'skill_name', content->>'skill_domain'
            ORDER BY invocation_count DESC
            LIMIT $2
        `, [days, limit]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Skills by Agent ─────────────────────────────────────────────────────────

app.get('/api/skills/by-agent', async (req, res) => {
    try {
        const days = parseInt(req.query.days || '30', 10);
        const result = await pool.query(`
            SELECT
                re.agent_id,
                a.name as agent_name,
                COUNT(*)::int as invocation_count,
                COUNT(DISTINCT re.content->>'skill_name')::int as unique_skills
            FROM raw_events re
            LEFT JOIN agents a ON re.agent_id = a.id
            WHERE re.event_type = 'skill_invocation'
              AND re.timestamp > NOW() - make_interval(days => $1)
            GROUP BY re.agent_id, a.name
            ORDER BY invocation_count DESC
        `, [days]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Skills by Domain ────────────────────────────────────────────────────────

app.get('/api/skills/by-domain', async (req, res) => {
    try {
        const days = parseInt(req.query.days || '30', 10);
        const result = await pool.query(`
            SELECT
                content->>'skill_domain' as domain,
                COUNT(*)::int as invocation_count,
                COUNT(*) FILTER (WHERE content->>'status' = 'completed')::int as success_count,
                ROUND(100.0 * COUNT(*) FILTER (WHERE content->>'status' = 'completed') / NULLIF(COUNT(*), 0))::int as success_rate
            FROM raw_events
            WHERE event_type = 'skill_invocation'
              AND timestamp > NOW() - make_interval(days => $1)
            GROUP BY content->>'skill_domain'
            ORDER BY invocation_count DESC
        `, [days]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Skills Timeline ─────────────────────────────────────────────────────────

app.get('/api/skills/timeline', async (req, res) => {
    try {
        const days = parseInt(req.query.days || '30', 10);
        const result = await pool.query(`
            SELECT
                DATE_TRUNC('day', timestamp)::date as date,
                COUNT(*)::int as invocation_count,
                COUNT(*) FILTER (WHERE content->>'status' = 'completed')::int as success_count
            FROM raw_events
            WHERE event_type = 'skill_invocation'
              AND timestamp > NOW() - make_interval(days => $1)
            GROUP BY DATE_TRUNC('day', timestamp)
            ORDER BY date ASC
        `, [days]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Recent Skill Invocations ────────────────────────────────────────────────

app.get('/api/skills/recent', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit || '50', 10);
        const result = await pool.query(`
            SELECT
                re.id,
                re.agent_id,
                a.name as agent_name,
                re.content->>'skill_name' as skill_name,
                re.content->>'skill_domain' as skill_domain,
                re.content->>'status' as status,
                (re.content->>'duration_ms')::int as duration_ms,
                re.content->>'arguments' as arguments,
                re.content->>'triggered_by' as triggered_by,
                re.timestamp
            FROM raw_events re
            LEFT JOIN agents a ON re.agent_id = a.id
            WHERE re.event_type = 'skill_invocation'
            ORDER BY re.timestamp DESC
            LIMIT $1
        `, [limit]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROPERTIES — Public Property Listings API
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Helpers ────────────────────────────────────────────────────────────────

const PROPERTIES_ALLOWED_SORTS = {
    newest: 'scraped_at DESC',
    price_asc: 'price_aed ASC',
    price_desc: 'price_aed DESC',
    size_desc: 'size_sqft DESC NULLS LAST',
};

function buildPropertiesWhereClause(query) {
    const conditions = ['is_available = TRUE', 'duplicate_of IS NULL'];
    const params = [];

    if (query.q) {
        params.push(`%${query.q}%`);
        conditions.push(`(title ILIKE $${params.length} OR community ILIKE $${params.length} OR display_address ILIKE $${params.length})`);
    }
    if (query.city) {
        params.push(query.city);
        conditions.push(`city = $${params.length}`);
    }
    if (query.community) {
        params.push(`%${query.community}%`);
        conditions.push(`community ILIKE $${params.length}`);
    }
    if (query.property_type) {
        params.push(query.property_type);
        conditions.push(`property_type = $${params.length}`);
    }
    if (query.bedrooms) {
        const beds = query.bedrooms.split(',').map(b => b.trim());
        const bedConditions = [];
        const hasStudio = beds.includes('studio') || beds.includes('0');
        const numericBeds = beds.filter(b => b !== 'studio' && b !== '0').map(Number).filter(n => !isNaN(n));

        if (hasStudio) {
            bedConditions.push('bedrooms_value = 0');
        }
        if (numericBeds.length > 0) {
            params.push(numericBeds);
            bedConditions.push(`bedrooms_value = ANY($${params.length}::int[])`);
        }
        if (bedConditions.length > 0) {
            conditions.push(`(${bedConditions.join(' OR ')})`);
        }
    }
    if (query.price_min) {
        params.push(Number(query.price_min));
        conditions.push(`price_aed >= $${params.length}`);
    }
    if (query.price_max) {
        params.push(Number(query.price_max));
        conditions.push(`price_aed <= $${params.length}`);
    }
    if (query.size_min) {
        params.push(Number(query.size_min));
        conditions.push(`size_sqft >= $${params.length}`);
    }
    if (query.size_max) {
        params.push(Number(query.size_max));
        conditions.push(`size_sqft <= $${params.length}`);
    }
    if (query.is_off_plan === 'true') {
        conditions.push('is_off_plan = TRUE');
    } else if (query.is_off_plan === 'false') {
        conditions.push('(is_off_plan = FALSE OR is_off_plan IS NULL)');
    }
    if (query.is_verified === 'true') {
        conditions.push('is_verified = TRUE');
    }
    if (query.furnishing) {
        params.push(query.furnishing);
        conditions.push(`furnishing = $${params.length}`);
    }

    return { where: conditions.join(' AND '), params };
}

// ─── GET /api/properties ────────────────────────────────────────────────────
// Main search + filter + pagination endpoint.

app.get('/api/properties', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(48, Math.max(1, parseInt(req.query.limit) || 24));
        const offset = (page - 1) * limit;
        const sortKey = PROPERTIES_ALLOWED_SORTS[req.query.sort] ? req.query.sort : 'newest';
        const orderBy = PROPERTIES_ALLOWED_SORTS[sortKey];

        const { where, params } = buildPropertiesWhereClause(req.query);

        params.push(limit);
        const limitParam = `$${params.length}`;
        params.push(offset);
        const offsetParam = `$${params.length}`;

        const sql = `
            SELECT
                pf_id, title, display_address, community, city,
                property_type, bedrooms, bedrooms_value, bathrooms,
                size_sqft, price_aed,
                furnishing, completion_status, is_off_plan, is_verified,
                is_premium, is_featured, is_exclusive,
                images, agent_name, broker_name,
                latitude, longitude,
                COUNT(*) OVER() AS total_count
            FROM properties
            WHERE ${where}
            ORDER BY ${orderBy}
            LIMIT ${limitParam} OFFSET ${offsetParam}
        `;

        const result = await pool.query(sql, params);
        const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

        res.json({
            data: result.rows.map(r => {
                const { total_count, ...row } = r;
                return row;
            }),
            meta: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error('GET /api/properties error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/properties/map ────────────────────────────────────────────────
// Lightweight coords-only endpoint for map markers. Max 500.

app.get('/api/properties/map', async (req, res) => {
    try {
        const { where, params } = buildPropertiesWhereClause(req.query);

        const sql = `
            SELECT pf_id, latitude AS lat, longitude AS lng, price_aed, is_off_plan
            FROM properties
            WHERE ${where}
              AND latitude IS NOT NULL
              AND longitude IS NOT NULL
            ORDER BY is_featured DESC NULLS LAST, scraped_at DESC
            LIMIT 500
        `;

        const result = await pool.query(sql, params);
        res.json({ markers: result.rows });
    } catch (err) {
        console.error('GET /api/properties/map error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/properties/facets ─────────────────────────────────────────────
// Aggregated counts for filter badges.

app.get('/api/properties/facets', async (req, res) => {
    try {
        const { where, params } = buildPropertiesWhereClause(req.query);

        const [typesRes, citiesRes, bedsRes, priceRes] = await Promise.all([
            pool.query(`
                SELECT property_type AS value, COUNT(*)::int AS count
                FROM properties WHERE ${where} AND property_type IS NOT NULL
                GROUP BY property_type ORDER BY count DESC
            `, params),
            pool.query(`
                SELECT city AS value, COUNT(*)::int AS count
                FROM properties WHERE ${where} AND city IS NOT NULL
                GROUP BY city ORDER BY count DESC
            `, params),
            pool.query(`
                SELECT bedrooms_value AS value, COUNT(*)::int AS count
                FROM properties WHERE ${where} AND bedrooms_value IS NOT NULL
                GROUP BY bedrooms_value ORDER BY bedrooms_value ASC
            `, params),
            pool.query(`
                SELECT MIN(price_aed)::bigint AS min, MAX(price_aed)::bigint AS max
                FROM properties WHERE ${where} AND price_aed IS NOT NULL
            `, params),
        ]);

        res.json({
            property_types: typesRes.rows,
            cities: citiesRes.rows,
            bedrooms: bedsRes.rows.map(r => ({
                value: r.value,
                label: r.value === 0 ? 'Studio' : `${r.value} Hab.`,
                count: r.count,
            })),
            price_range: priceRes.rows[0] || { min: 0, max: 0 },
        });
    } catch (err) {
        console.error('GET /api/properties/facets error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/properties/:pf_id ─────────────────────────────────────────────
// Single property detail (for map popup and detail page).

app.get('/api/properties/:pf_id', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM properties WHERE pf_id = $1`,
            [req.params.pf_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Property not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('GET /api/properties/:pf_id error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTION: Serve React Build
// ═══════════════════════════════════════════════════════════════════════════════

if (process.env.NODE_ENV === 'production') {
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    // Serve static files from dist/
    app.use(express.static(path.join(__dirname, 'dist')));

    // SPA fallback: non-API routes serve index.html (Express 5 compatible)
    app.use((req, res, next) => {
        // Skip API routes
        if (req.path.startsWith('/api/')) {
            return next();
        }
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
}

// ─── Start ───────────────────────────────────────────────────────────────────

// En local, iniciar servidor (en Vercel este listen es ignorado)
if (!process.env.VERCEL) {
    app.listen(port, () => {
        console.log(`🚀 Dashboard server running on http://localhost:${port}`);
        console.log(`📊 API endpoints: http://localhost:${port}/api/*`);
        if (process.env.NODE_ENV === 'production') {
            console.log(`📦 Serving React build from dist/`);
        }
    });
}

// Exportar para Vercel serverless (siempre presente para evitar syntax error)
export default app;
