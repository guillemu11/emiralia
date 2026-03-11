/**
 * Emiralia — Weekly Workflow: Research Agent Cycle
 *
 * Invokes the Research Agent's monitoring cycle and registers
 * the run in workflow_runs.
 *
 * Run: node tools/workspace-skills/workflow-weekly.js
 */

import pool from '../db/pool.js';
import { runResearchCycle } from '../research-agent/orchestrator.js';
import { trackSkill } from './skill-tracker.js';

async function runWeeklyWorkflow() {
    trackSkill('system', 'workflow-weekly', 'ops', 'completed').catch(() => {});
    console.log('=== Weekly Workflow: Research Agent Cycle ===');
    const startTime = Date.now();

    try {
        // 1. Run research cycle
        const report = await runResearchCycle();

        // 2. Register in workflow_runs
        const elapsed = Date.now() - startTime;
        await pool.query(
            `INSERT INTO workflow_runs (workflow_name, status, duration_ms, metadata)
             VALUES ($1, $2, $3, $4)`,
            [
                'workflow-weekly-research',
                'completed',
                elapsed,
                JSON.stringify({
                    total_raw: report.total_raw,
                    total_filtered: report.total_filtered,
                    summary: report.summary,
                    sources_status: report.sources_status,
                }),
            ]
        );

        console.log(`=== Weekly Workflow Complete (${(elapsed / 1000).toFixed(1)}s) ===`);
        console.log(`Report: ${report.total_filtered} novelties (${report.summary.high} high, ${report.summary.medium} medium, ${report.summary.low} low)`);
    } catch (err) {
        const elapsed = Date.now() - startTime;

        // Register failure
        await pool.query(
            `INSERT INTO workflow_runs (workflow_name, status, duration_ms, metadata)
             VALUES ($1, $2, $3, $4)`,
            [
                'workflow-weekly-research',
                'failed',
                elapsed,
                JSON.stringify({ error: err.message }),
            ]
        ).catch(() => {});

        console.error(`=== Weekly Workflow Failed: ${err.message} ===`);
        throw err;
    } finally {
        await pool.end();
    }
}

runWeeklyWorkflow().catch(err => {
    console.error(err);
    process.exit(1);
});
