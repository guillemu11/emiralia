import pool from '../db/pool.js';

/**
 * Log a granular activity for an agent.
 * e.g. recordActivity('data-agent', 'tool_call', { tool: 'apify/web-scraper', result: 'success' })
 */
export async function recordActivity(agentId, eventType, content) {
    const query = `
        INSERT INTO raw_events (agent_id, event_type, content)
        VALUES ($1, $2, $3)
        RETURNING id;
    `;
    try {
        const res = await pool.query(query, [agentId, eventType, JSON.stringify(content)]);
        console.log(`[Harvester] Recorded ${eventType} for ${agentId} (ID: ${res.rows[0].id})`);
        return res.rows[0].id;
    } catch (err) {
        console.error('[Harvester] Error recording activity:', err);
    }
}

// CLI usage
const cmd = process.argv[2];

if (cmd === 'record') {
    const agentId = process.argv[3];
    const eventType = process.argv[4];
    const contentRaw = process.argv[5];
    if (!agentId || !eventType || !contentRaw) {
        console.error('Usage: node activity-harvester.js record <agentId> <eventType> \'<jsonContent>\'');
        process.exit(1);
    }
    let content;
    try { content = JSON.parse(contentRaw); } catch { content = { description: contentRaw, status: 'success' }; }
    await recordActivity(agentId, eventType, content);
    await pool.end();
} else if (cmd === '--test') {
    await recordActivity('data-agent', 'tool_call', {
        tool: 'mcp_apify-local_call-actor',
        input: { actor: 'apify/web-scraper' },
        status: 'success',
        extracted: 450
    });
    await pool.end();
}
