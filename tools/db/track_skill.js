/**
 * Emiralia — Thin Tracking Wrapper
 *
 * Simplified fire-and-forget wrapper over skill-tracker.js.
 * Import this from any tool to auto-register its execution.
 *
 * Usage:
 *   import { track } from '../db/track_skill.js';
 *   track('tool-name', 'agent-id');
 *
 * CLI:
 *   node tools/db/track_skill.js <toolName> [agentId]
 */

import { trackSkill } from '../workspace-skills/skill-tracker.js';

/**
 * Fire-and-forget tracking. Never throws, never blocks.
 * @param {string} toolName  - Name of the tool being executed
 * @param {string} [agentId] - Agent executing the tool (default: 'system')
 * @param {string} [domain]  - Domain category (default: 'tool')
 */
export function track(toolName, agentId = 'system', domain = 'tool') {
    trackSkill(agentId, toolName, domain, 'completed').catch(() => {});
}

// ─── CLI ────────────────────────────────────────────────────────────────────

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('track_skill.js');

if (isDirectRun && process.argv[2]) {
    const toolName = process.argv[2];
    const agentId = process.argv[3] || 'system';
    const domain = process.argv[4] || 'tool';

    try {
        await trackSkill(agentId, toolName, domain, 'completed');
        console.log(`[track] Recorded: ${toolName} by ${agentId}`);
    } catch (err) {
        console.error(`[track] Error: ${err.message}`);
        process.exit(1);
    } finally {
        const pool = (await import('../db/pool.js')).default;
        await pool.end();
    }
} else if (isDirectRun) {
    console.error('Usage: node tools/db/track_skill.js <toolName> [agentId] [domain]');
    process.exit(1);
}
