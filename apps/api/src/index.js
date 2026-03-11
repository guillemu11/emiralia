import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

// Load .env from project root (../../..) before any other imports execute
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

import express from 'express';
import cors from 'cors';
import pg from 'pg';
import { createClient } from 'redis';
import inboxRouter from './routes/inbox.js';
import propertiesRouter from './routes/properties.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Postgres Pool
const pool = new pg.Pool({
    host: process.env.PG_HOST || 'localhost',
    user: process.env.PG_USER || 'emiralia',
    password: process.env.PG_PASSWORD || 'changeme',
    database: process.env.PG_DB || 'emiralia',
    port: process.env.PG_PORT || 5432,
});

// Redis Client
const redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST || 'localhost'}:6379`
});

redisClient.on('error', err => console.log('Redis Client Error', err));
await redisClient.connect();

// Inbox + PM Agent Chat routes
app.use('/api', inboxRouter);

// Property search routes (website)
app.use('/api', propertiesRouter);

// Routes
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Agent Routes
app.get('/api/agents', async (req, res) => {
    const { department } = req.query;
    try {
        let query = 'SELECT * FROM agents';
        const params = [];
        if (department) { params.push(department); query += ' WHERE department = $1'; }
        query += ' ORDER BY id ASC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/agents/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM agents WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Agent not found' });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/agents/:id', async (req, res) => {
    const { status } = req.body;
    try {
        const result = await pool.query(
            'UPDATE agents SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [status, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// EOD Reports Routes
app.get('/api/reports', async (req, res) => {
    const { date, agent_id } = req.query;
    try {
        let query = `SELECT * FROM eod_reports WHERE 1=1`;
        const params = [];
        if (date) { params.push(date); query += ` AND date = $${params.length}`; }
        if (agent_id) { params.push(agent_id); query += ` AND agent_id = $${params.length}`; }
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/eod-reports', async (req, res) => {
    const { agent_id, date, completed_tasks, in_progress_tasks, blockers, insights, plan_tomorrow, mood } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO eod_reports (agent_id, date, completed_tasks, in_progress_tasks, blockers, insights, plan_tomorrow, mood)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (agent_id, date) DO UPDATE
             SET completed_tasks = EXCLUDED.completed_tasks,
                 in_progress_tasks = EXCLUDED.in_progress_tasks,
                 blockers = EXCLUDED.blockers,
                 insights = EXCLUDED.insights,
                 plan_tomorrow = EXCLUDED.plan_tomorrow,
                 mood = EXCLUDED.mood
             RETURNING *`,
            [agent_id, date || new Date().toISOString().split('T')[0],
                JSON.stringify(completed_tasks || []), JSON.stringify(in_progress_tasks || []),
                JSON.stringify(blockers || []), JSON.stringify(insights || []),
                JSON.stringify(plan_tomorrow || []), mood]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Weekly Sessions
app.get('/api/weekly-sessions', async (req, res) => {
    const { department } = req.query;
    try {
        let query = `SELECT * FROM weekly_sessions WHERE 1=1`;
        const params = [];
        if (department) { params.push(department); query += ` AND department = $${params.length}`; }
        query += ` ORDER BY session_date DESC`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/weekly-sessions', async (req, res) => {
    const { department, week_number, session_date, steps_data, final_projects } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO weekly_sessions (department, week_number, session_date, steps_data, final_projects)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [department, week_number, session_date || new Date(), JSON.stringify(steps_data || {}), JSON.stringify(final_projects || [])]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Daily Standup Route (Departmental)
app.get('/api/workspace/:dept/daily', async (req, res) => {
    const { dept } = req.params;
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    try {
        const result = await pool.query(`
      SELECT r.*, a.name, a.role, a.avatar
      FROM eod_reports r
      JOIN agents a ON r.agent_id = a.id
      WHERE a.department = $1 AND r.date = $2
    `, [dept, targetDate]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Audit Log Route
app.get('/api/audit', async (req, res) => {
    const { dept, type } = req.query;
    try {
        let query = `SELECT l.*, a.name as agent_name, a.avatar as agent_avatar FROM audit_log l LEFT JOIN agents a ON l.agent_id = a.id WHERE 1=1`;
        const params = [];
        if (dept && dept !== 'all') { params.push(dept); query += ` AND l.department = $${params.length}`; }
        if (type && type !== 'all') { params.push(type); query += ` AND l.event_type = $${params.length}`; }
        query += ` ORDER BY l.date DESC LIMIT 50`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/audit', async (req, res) => {
    const { event_type, department, agent_id, title, details } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO audit_log (event_type, department, agent_id, title, details)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [event_type, department, agent_id, title, details]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Raises Route
app.get('/api/raises', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT r.*, a.name as agent_name, a.avatar as agent_avatar 
      FROM collaboration_raises r 
      LEFT JOIN agents a ON r.agent_id = a.id 
      ORDER BY r.date DESC
    `);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/raises', async (req, res) => {
    const { from_dept, to_dept, title, reason, priority, agent_id } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO collaboration_raises (from_dept, to_dept, title, reason, priority, agent_id)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [from_dept, to_dept, title, reason, priority || 'normal', agent_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/raises/:id', async (req, res) => {
    const { status } = req.body;
    try {
        const result = await pool.query(
            'UPDATE collaboration_raises SET status = $1 WHERE id = $2 RETURNING *',
            [status, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Departments (derived from agents table) ────────────────────────────────

const DEPARTMENTS = [
    { id: 'data', name: 'Data', emoji: '📊', color: '#3B82F6', description: 'Extracción, limpieza y normalización de datos de propiedades' },
    { id: 'dev', name: 'Development', emoji: '💻', color: '#8B5CF6', description: 'Features, bugs e infraestructura del codebase' },
    { id: 'content', name: 'Content', emoji: '✍️', color: '#F59E0B', description: 'Fichas de propiedades, blog y descripciones SEO' },
    { id: 'seo', name: 'SEO', emoji: '🔍', color: '#10B981', description: 'Keywords, metadatos y arquitectura de enlaces' },
    { id: 'design', name: 'Design', emoji: '🎨', color: '#EC4899', description: 'UI/UX, creatividades e identidad visual' },
    { id: 'product', name: 'Product', emoji: '🧭', color: '#6366F1', description: 'Sprints, backlog y coordinación entre agentes' },
    { id: 'marketing', name: 'Marketing', emoji: '📢', color: '#F97316', description: 'Campañas, copies y métricas de canales' },
    { id: 'sales', name: 'Sales', emoji: '🤝', color: '#14B8A6', description: 'Pipeline de compradores hispanohablantes' },
    { id: 'ops', name: 'Operations', emoji: '🔧', color: '#78716C', description: 'Auditoría, calidad y meta-sistema WAT' },
];

app.get('/api/departments', async (req, res) => {
    try {
        const agentsResult = await pool.query('SELECT department, status FROM agents');
        const depts = DEPARTMENTS.map(d => {
            const deptAgents = agentsResult.rows.filter(a => a.department === d.id);
            const activeCount = deptAgents.filter(a => a.status === 'active').length;
            const errorCount = deptAgents.filter(a => a.status === 'error').length;
            return {
                ...d,
                agentCount: deptAgents.length,
                activeCount,
                health: errorCount > 0 ? 'critical' : activeCount === 0 && deptAgents.length > 0 ? 'warning' : 'good',
            };
        });
        res.json(depts);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/departments/:id', async (req, res) => {
    const dept = DEPARTMENTS.find(d => d.id === req.params.id);
    if (!dept) return res.status(404).json({ error: 'Department not found' });
    try {
        const agentsResult = await pool.query('SELECT * FROM agents WHERE department = $1 ORDER BY id', [req.params.id]);
        const weeklyResult = await pool.query(
            'SELECT * FROM weekly_sessions WHERE department = $1 ORDER BY session_date DESC LIMIT 1',
            [req.params.id]
        );
        res.json({
            ...dept,
            agents: agentsResult.rows,
            latestWeekly: weeklyResult.rows[0] || null,
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── EOD Reports (GET with department/date filters) ─────────────────────────

app.get('/api/eod-reports', async (req, res) => {
    const { department, date, agent_id } = req.query;
    try {
        let query = `SELECT r.*, a.name as agent_name, a.avatar, a.role FROM eod_reports r JOIN agents a ON r.agent_id = a.id WHERE 1=1`;
        const params = [];
        if (department) { params.push(department); query += ` AND a.department = $${params.length}`; }
        if (date) { params.push(date); query += ` AND r.date = $${params.length}`; }
        if (agent_id) { params.push(agent_id); query += ` AND r.agent_id = $${params.length}`; }
        query += ' ORDER BY r.date DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Weekly Sessions (PATCH + import-inbox) ─────────────────────────────────

app.patch('/api/weekly-sessions/:id', async (req, res) => {
    const { status, steps_data, report } = req.body;
    try {
        const fields = [];
        const params = [];
        if (status) { params.push(status); fields.push(`status = $${params.length}`); }
        if (steps_data) { params.push(JSON.stringify(steps_data)); fields.push(`steps_data = $${params.length}`); }
        if (report) { params.push(JSON.stringify(report)); fields.push(`report = $${params.length}`); }
        fields.push('updated_at = NOW()');
        params.push(req.params.id);
        const result = await pool.query(
            `UPDATE weekly_sessions SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
            params
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/weekly-sessions/:id/import-inbox', async (req, res) => {
    try {
        const session = await pool.query('SELECT department FROM weekly_sessions WHERE id = $1', [req.params.id]);
        if (session.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
        const dept = session.rows[0].department;
        const items = await pool.query(
            `SELECT id, name AS title, department, status, problem AS description, sub_area
             FROM projects
             WHERE LOWER(department) = LOWER($1)
             ORDER BY updated_at DESC LIMIT 20`,
            [dept]
        );
        await pool.query(
            'UPDATE weekly_sessions SET inbox_snapshot = $1, updated_at = NOW() WHERE id = $2',
            [JSON.stringify(items.rows), req.params.id]
        );
        res.json({ items: items.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/weekly-sessions/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM weekly_sessions WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
        res.json({ deleted: true, session: result.rows[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Audit Events (alias for /api/audit) ────────────────────────────────────

app.get('/api/audit-events', async (req, res) => {
    const { department, type } = req.query;
    try {
        let query = `SELECT l.*, a.name as agent_name, a.avatar as agent_avatar FROM audit_log l LEFT JOIN agents a ON l.agent_id = a.id WHERE 1=1`;
        const params = [];
        if (department && department !== 'all') { params.push(department); query += ` AND l.department = $${params.length}`; }
        if (type && type !== 'all') { params.push(type); query += ` AND l.event_type = $${params.length}`; }
        query += ` ORDER BY l.date DESC LIMIT 50`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── PM Reports ─────────────────────────────────────────────────────────────

app.get('/api/pm-reports', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pm_reports ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/pm-reports/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pm_reports WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/pm-reports/generate', async (req, res) => {
    try {
        const agents = await pool.query('SELECT id, name, status, department FROM agents');
        const recentEod = await pool.query('SELECT * FROM eod_reports WHERE date >= CURRENT_DATE - INTERVAL \'7 days\' ORDER BY date DESC');
        const recentAudit = await pool.query('SELECT * FROM audit_log WHERE date >= NOW() - INTERVAL \'7 days\' ORDER BY date DESC LIMIT 20');
        const activeRaises = await pool.query("SELECT * FROM collaboration_raises WHERE status = 'pending'");

        const totalAgents = agents.rows.length;
        const activeAgents = agents.rows.filter(a => a.status === 'active').length;
        const totalEod = recentEod.rows.length;
        const blockers = recentEod.rows.flatMap(r => {
            const b = typeof r.blockers === 'string' ? JSON.parse(r.blockers) : (r.blockers || []);
            return b;
        });

        const title = `Reporte Semanal — ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`;
        const summary = `${activeAgents}/${totalAgents} agentes activos. ${totalEod} EOD reports esta semana. ${activeRaises.rows.length} raises pendientes. ${blockers.length} blockers reportados.`;

        const result = await pool.query(
            `INSERT INTO pm_reports (title, summary, metrics, risks, next_steps)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [
                title,
                summary,
                JSON.stringify({ agents_active: activeAgents, agents_total: totalAgents, eod_count: totalEod, blockers_count: blockers.length, pending_raises: activeRaises.rows.length }),
                JSON.stringify(blockers.slice(0, 5).map(b => ({ risk: b.desc || b, severity: b.severity === 'high' ? 'ALTA' : 'MEDIA', mitigation: 'Pendiente de revisión' }))),
                JSON.stringify([{ action: 'Revisar blockers activos', priority: 'high' }, { action: 'Cerrar raises pendientes', priority: 'medium' }]),
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Leads (Early Access Forms) ─────────────────────────────────────────────

app.post('/api/leads', async (req, res) => {
    const { name, email, country, interests, source, message, metadata } = req.body;

    // Validation
    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO leads (name, email, country, interests, source, message, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (email) DO UPDATE
             SET name = EXCLUDED.name,
                 country = EXCLUDED.country,
                 interests = EXCLUDED.interests,
                 source = EXCLUDED.source,
                 message = EXCLUDED.message,
                 metadata = EXCLUDED.metadata,
                 updated_at = NOW()
             RETURNING *`,
            [
                name,
                email.toLowerCase().trim(),
                country || null,
                JSON.stringify(interests || []),
                source || 'website',
                message || null,
                JSON.stringify(metadata || {})
            ]
        );

        res.status(201).json({ success: true, lead: result.rows[0] });
    } catch (err) {
        console.error('POST /api/leads error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/leads', async (req, res) => {
    try {
        const { source, limit } = req.query;
        let query = 'SELECT * FROM leads WHERE 1=1';
        const params = [];

        if (source) {
            params.push(source);
            query += ` AND source = $${params.length}`;
        }

        query += ' ORDER BY created_at DESC';

        if (limit) {
            params.push(parseInt(limit, 10));
            query += ` LIMIT $${params.length}`;
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('GET /api/leads error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Pipeline (Kanban view) ─────────────────────────────────────────────────

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
    } catch (err) { res.status(500).json({ error: err.message }); }
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
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Projects ───────────────────────────────────────────────────────────────

app.get('/api/projects', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM projects ORDER BY updated_at DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/projects/:id', async (req, res) => {
    try {
        const project = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
        if (project.rows.length === 0) return res.status(404).json({ error: 'Project not found' });

        const phases = await pool.query(
            'SELECT * FROM phases WHERE project_id = $1 ORDER BY phase_number', [req.params.id]
        );

        for (const phase of phases.rows) {
            const tasks = await pool.query(
                'SELECT * FROM tasks WHERE phase_id = $1 ORDER BY id', [phase.id]
            );
            phase.tasks = tasks.rows;
        }

        res.json({ ...project.rows[0], phases: phases.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/projects/:id', async (req, res) => {
    try {
        const { name, problem, solution, department, sub_area, status,
                pain_points, requirements, risks, estimated_budget,
                estimated_timeline, future_improvements, blocks, success_metrics } = req.body;
        const result = await pool.query(
            `UPDATE projects SET name=$1, problem=$2, solution=$3, department=$4, sub_area=$5,
             status=$6, pain_points=$7, requirements=$8, risks=$9, estimated_budget=$10,
             estimated_timeline=$11, future_improvements=$12, blocks=$13, success_metrics=$14
             WHERE id=$15 RETURNING *`,
            [name, problem, solution, department, sub_area, status,
             JSON.stringify(pain_points || []), JSON.stringify(requirements || []),
             JSON.stringify(risks || []), estimated_budget || 0, estimated_timeline || 'TBD',
             JSON.stringify(future_improvements || []), JSON.stringify(blocks || []),
             JSON.stringify(success_metrics || []), req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/projects/:id', async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ deleted: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Intelligence Summary ───────────────────────────────────────────────────

app.get('/api/intelligence/summary', async (req, res) => {
    try {
        const agents = await pool.query('SELECT status FROM agents');
        const todayEod = await pool.query('SELECT COUNT(*) as cnt FROM eod_reports WHERE date = CURRENT_DATE');
        const rawEvents = await pool.query('SELECT COUNT(*) as cnt FROM raw_events');
        const auditWeek = await pool.query("SELECT COUNT(*) as cnt FROM audit_log WHERE date >= NOW() - INTERVAL '7 days'");
        const activeRaises = await pool.query("SELECT COUNT(*) as cnt FROM collaboration_raises WHERE status = 'pending'");
        const todayBlockers = await pool.query(`
            SELECT r.blockers FROM eod_reports r WHERE r.date = CURRENT_DATE AND r.blockers != '[]'::jsonb
        `);

        const blockerList = todayBlockers.rows.flatMap(r => {
            const b = typeof r.blockers === 'string' ? JSON.parse(r.blockers) : (r.blockers || []);
            return b.map(item => item.desc || item);
        });

        res.json({
            agents: {
                total: agents.rows.length,
                active: agents.rows.filter(a => a.status === 'active').length,
            },
            today: {
                eodReports: parseInt(todayEod.rows[0].cnt),
            },
            totals: {
                rawEvents: parseInt(rawEvents.rows[0].cnt),
                auditEventsWeek: parseInt(auditWeek.rows[0].cnt),
            },
            activeRaises: parseInt(activeRaises.rows[0].cnt),
            todayBlockers: blockerList,
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(port, () => {
    console.log(`Backend API listening at http://localhost:${port}`);
});
