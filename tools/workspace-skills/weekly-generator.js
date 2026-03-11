import pool from '../db/pool.js';
import fetch from 'node-fetch';
import { trackSkill } from './skill-tracker.js';

const API_URL = process.env.API_URL || 'http://localhost:3001/api';

/**
 * Weekly Session Generator
 * Simulates Petra (PM) brainstorming a new week based on previous EODs.
 */
export async function generateWeeklySession(deptId, weekNumber) {
    trackSkill('pm-agent', 'weekly-generator', 'ops', 'completed').catch(() => {});
    console.log(`[Weekly Gen] Brainstorming Week ${weekNumber} for ${deptId}...`);

    try {
        // 1. Get Agents
        const agentsRes = await pool.query('SELECT * FROM agents WHERE department = $1', [deptId]);
        const agents = agentsRes.rows;

        // 2. Get Recent EODs (last 5 days)
        const eodsRes = await pool.query(
            `SELECT r.*, a.name as agent_name FROM eod_reports r 
             JOIN agents a ON r.agent_id = a.id 
             WHERE a.department = $1 AND r.date > now() - interval '7 days'`,
            [deptId]
        );
        const eods = eodsRes.rows;

        // 3. Brainstorm (Logic / LLM Placeholder)
        const steps = {
            "Recopilación": `Analizados ${eods.length} reportes de la semana anterior.`,
            "Priorización": "Identificados cuellos de botella en scraping de portales.",
            "Asignación": `Preparadas tareas para ${agents.length} agentes.`,
            "Finalización": "Roadmap de la semana listo."
        };

        const projects = [
            { title: "Optimización Scraper Dubai South", status: "planning" },
            { title: "Limpieza de Leads Duplicados", status: "todo" }
        ];

        // 4. POST to API
        const body = {
            department: deptId,
            week_number: parseInt(weekNumber),
            session_date: new Date().toISOString().split('T')[0],
            steps_data: steps,
            final_projects: projects
        };

        const res = await fetch(`${API_URL}/weekly-sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) throw new Error(`API Error: ${res.status}`);

        const data = await res.json();
        console.log(`[Weekly Gen] Session created successfully (ID: ${data.id})`);
        return data;

    } catch (err) {
        console.error('[Weekly Gen] Error:', err);
        throw err;
    }
}

// CLI usage
if (process.argv[2] === '--run') {
    const dept = process.argv[3] || 'data';
    const week = process.argv[4] || 10;
    await generateWeeklySession(dept, week);
    await pool.end();
}
