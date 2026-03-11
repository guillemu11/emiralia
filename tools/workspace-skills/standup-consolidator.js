import pool from '../db/pool.js';
import { trackSkill } from './skill-tracker.js';

/**
 * Standup Consolidator
 * Aggregates EOD reports for a department on a specific date.
 */
export async function consolidateStandup(department, date = new Date().toISOString().split('T')[0]) {
    trackSkill('pm-agent', 'standup-consolidator', 'ops', 'completed').catch(() => {});
    console.log(`[Standup] Processing ${department} for ${date}...`);

    // 1. Fetch all reports for the department on this date
    const res = await pool.query(
        `SELECT r.*, a.name, a.department
         FROM eod_reports r
         JOIN agents a ON r.agent_id = a.id
         WHERE a.department = $1 AND r.date = $2`,
        [department, date]
    );
    const reports = res.rows;

    if (reports.length === 0) {
        console.log(`[Standup] No reports found for ${department} on ${date}.`);
        return null;
    }

    // 2. Aggregate
    const allBlockers = reports.flatMap(r =>
        (Array.isArray(r.blockers) ? r.blockers : []).map(b => ({ ...b, agent: r.name }))
    );
    const allCompleted = reports.flatMap(r =>
        (Array.isArray(r.completed_tasks) ? r.completed_tasks : []).map(c => ({ ...c, agent: r.name }))
    );

    // 3. Record in Audit Log
    const details = `${reports.length} reports consolidated. ${allCompleted.length} tasks done. ${allBlockers.length} blockers.`;
    await pool.query(
        `INSERT INTO audit_log (event_type, department, title, details, date)
         VALUES ($1, $2, $3, $4, $5)`,
        ['daily', department, `Daily Standup: ${department}`, details, new Date(date)]
    );

    console.log(`[Standup] Consolidated: ${details}`);
    return { department, date, reportCount: reports.length, blockers: allBlockers, completed: allCompleted };
}

// CLI usage
if (process.argv[2] === '--test') {
    await consolidateStandup(process.argv[3] || 'data');
    await pool.end();
}
