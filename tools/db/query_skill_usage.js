/**
 * Emiralia — Skill Usage Ranking Query
 *
 * Queries raw_events for skill_invocation events and produces
 * a ranked report of skill usage with activity status.
 *
 * Usage as module:
 *   import { getSkillRanking } from './tools/db/query_skill_usage.js';
 *   const rankings = await getSkillRanking({ days: 30, limit: 20 });
 *
 * CLI:
 *   node tools/db/query_skill_usage.js ranking [--days=30] [--limit=20]
 */

import pool from './pool.js';

/**
 * Get skill usage ranking from raw_events.
 * @param {Object} opts
 * @param {number} [opts.days=30] - Look-back window in days
 * @param {number} [opts.limit=20] - Max results
 * @returns {Array<{skill_name, domain, total, last_used, days_inactive, ok, fail}>}
 */
export async function getSkillRanking({ days = 30, limit = 20 } = {}) {
    const res = await pool.query(`
        SELECT
            content->>'skill_name'  AS skill_name,
            content->>'skill_domain' AS domain,
            COUNT(*)::int           AS total,
            MAX(timestamp)          AS last_used,
            EXTRACT(DAY FROM NOW() - MAX(timestamp))::int AS days_inactive,
            COUNT(*) FILTER (WHERE content->>'status' = 'completed')::int AS ok,
            COUNT(*) FILTER (WHERE content->>'status' = 'failed')::int   AS fail
        FROM raw_events
        WHERE event_type = 'skill_invocation'
          AND timestamp >= NOW() - make_interval(days => $1)
        GROUP BY 1, 2
        ORDER BY total DESC
        LIMIT $2
    `, [days, limit]);

    return res.rows;
}

/**
 * Get all-time skill usage (for zombies outside the ranking window).
 */
export async function getAllSkillNames() {
    const res = await pool.query(`
        SELECT DISTINCT content->>'skill_name' AS skill_name
        FROM raw_events
        WHERE event_type = 'skill_invocation'
    `);
    return res.rows.map(r => r.skill_name);
}

// ─── CLI ────────────────────────────────────────────────────────────────────

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('query_skill_usage.js');

if (isDirectRun) {
    const args = process.argv.slice(2);
    const cmd = args[0] || 'ranking';

    const daysArg = args.find(a => a.startsWith('--days='));
    const limitArg = args.find(a => a.startsWith('--limit='));
    const days = daysArg ? parseInt(daysArg.split('=')[1], 10) : 30;
    const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 20;

    try {
        if (cmd === 'ranking') {
            const rankings = await getSkillRanking({ days, limit });
            if (rankings.length === 0) {
                console.log('No skill invocations found.');
            } else {
                console.log(`\nSkill Ranking (last ${days} days)\n${'─'.repeat(60)}`);
                for (const r of rankings) {
                    const status = r.days_inactive <= 7 ? '✅' : r.days_inactive <= 30 ? '⚠️' : '💀';
                    const lastStr = r.days_inactive === 0 ? 'hoy' : `hace ${r.days_inactive}d`;
                    console.log(`${status} ${r.skill_name.padEnd(28)} ${String(r.total).padStart(4)}x  (${lastStr})  [${r.domain}]`);
                }
            }
        } else {
            console.error('Usage: node tools/db/query_skill_usage.js ranking [--days=N] [--limit=N]');
        }
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}
