import pool from '../db/pool.js';
import { generateEodReport } from './eod-generator.js';
import { consolidateStandup } from './standup-consolidator.js';
import { trackSkill } from './skill-tracker.js';

async function runNightlyWorkflow() {
    trackSkill('system', 'workflow-nightly', 'ops', 'completed').catch(() => {});
    console.log('=== Nightly Workflow: Emiralia OS ===');
    const date = new Date().toISOString().split('T')[0];

    // 1. Get all active agents
    const agentsRes = await pool.query("SELECT id, department FROM agents WHERE status = 'active'");
    const agents = agentsRes.rows;
    console.log(`Found ${agents.length} active agents`);

    // 2. Generate EOD for each
    for (const agent of agents) {
        await generateEodReport(agent.id, date);
    }

    // 3. Consolidate by department
    const depts = [...new Set(agents.map(a => a.department))];
    for (const dept of depts) {
        await consolidateStandup(dept, date);
    }

    console.log('=== Nightly Workflow Complete ===');
    await pool.end();
}

runNightlyWorkflow().catch(console.error);
