/**
 * Emiralia Research Agent — Orchestrator
 *
 * Main entry point for the research cycle:
 *   1. Read checkpoints from memory
 *   2. Fetch from all sources (parallel)
 *   3. Filter by relevance
 *   4. Build structured report
 *   5. Persist to pm_reports + update memory
 *
 * Run: node tools/research-agent/orchestrator.js
 */

import { fetchAnthropicChangelog } from './fetch-anthropic-changelog.js';
import { fetchGithubReleases } from './fetch-github-releases.js';
import { fetchCommunity } from './fetch-community.js';
import { filterByRelevance, summarizeResults } from './relevance-filter.js';
import { getMemory, setMemory } from '../db/memory.js';
import { saveResearch } from '../db/save_research.js';
import pool from '../db/pool.js';
import { trackSkill } from '../workspace-skills/skill-tracker.js';

const AGENT_ID = 'research-agent';

/**
 * Run a complete research cycle.
 * @returns {Object} The generated report
 */
export async function runResearchCycle() {
    trackSkill('dev-agent', 'research-orchestrator', 'ops', 'completed').catch(() => {});
    console.log('=== Research Agent: Starting Cycle ===');
    const startTime = Date.now();

    // 1. Read checkpoints
    const [lastDateRes, lastTagRes, lastPostRes] = await Promise.all([
        getMemory(AGENT_ID, 'last_processed_date_anthropic'),
        getMemory(AGENT_ID, 'last_processed_tag_github'),
        getMemory(AGENT_ID, 'last_processed_post_reddit'),
    ]);

    const lastProcessedDate = lastDateRes?.value || null;
    const lastProcessedTag = lastTagRes?.value || null;
    const lastPostId = lastPostRes?.value || null;

    console.log(`[Checkpoints] Anthropic: ${lastProcessedDate || 'none'}, GitHub: ${lastProcessedTag || 'none'}, Reddit: ${lastPostId || 'none'}`);

    // 2. Fetch from all sources (parallel, graceful errors)
    const sourcesStatus = {};
    const [anthropicEntries, githubEntries, communityEntries] = await Promise.all([
        fetchAnthropicChangelog({ lastProcessedDate })
            .then(entries => { sourcesStatus['anthropic-docs'] = 'ok'; return entries; })
            .catch(err => { sourcesStatus['anthropic-docs'] = `error: ${err.message}`; return []; }),
        fetchGithubReleases({ lastProcessedTag })
            .then(entries => { sourcesStatus['github-releases'] = 'ok'; return entries; })
            .catch(err => { sourcesStatus['github-releases'] = `error: ${err.message}`; return []; }),
        fetchCommunity({ lastPostId })
            .then(entries => { sourcesStatus['reddit-r/ClaudeAI'] = 'ok'; return entries; })
            .catch(err => { sourcesStatus['reddit-r/ClaudeAI'] = `error: ${err.message}`; return []; }),
    ]);

    const totalRaw = anthropicEntries.length + githubEntries.length + communityEntries.length;
    console.log(`[Fetch] Raw entries: Anthropic=${anthropicEntries.length}, GitHub=${githubEntries.length}, Reddit=${communityEntries.length} (total=${totalRaw})`);

    // 3. Filter by relevance
    const allEntries = [...anthropicEntries, ...githubEntries, ...communityEntries];
    const filtered = filterByRelevance(allEntries);
    const summary = summarizeResults(filtered);

    console.log(`[Filter] Filtered: ${filtered.length}/${totalRaw} (high=${summary.high}, medium=${summary.medium}, low=${summary.low})`);

    // 4. Build report
    const report = {
        generated_at: new Date().toISOString(),
        sources_checked: ['anthropic-docs', 'github-releases', 'reddit-r/ClaudeAI'],
        sources_status: sourcesStatus,
        total_raw: totalRaw,
        total_filtered: filtered.length,
        novelties: filtered,
        summary,
    };

    // 5. Generate markdown for persistence
    const bodyMd = generateMarkdown(report);

    // 6. Persist to pm_reports
    const reportId = await saveResearch({
        title: `Research Intelligence Report — ${new Date().toISOString().split('T')[0]}`,
        summary: `${filtered.length} novedades detectadas (${summary.high} high, ${summary.medium} medium, ${summary.low} low). Fuentes: ${Object.entries(sourcesStatus).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
        body_md: bodyMd,
        metrics: {
            total_raw: totalRaw,
            total_filtered: filtered.length,
            ...summary,
            sources_status: sourcesStatus,
        },
    });

    console.log(`[Persist] Report saved to pm_reports (id=${reportId})`);

    // 7. Update memory checkpoints
    const now = new Date().toISOString();

    // Update dedup checkpoints
    if (anthropicEntries.length > 0) {
        const latestDate = anthropicEntries
            .map(e => e.date)
            .filter(Boolean)
            .sort()
            .pop();
        if (latestDate) {
            await setMemory(AGENT_ID, 'last_processed_date_anthropic', latestDate, 'private');
        }
    }

    if (githubEntries.length > 0) {
        const latestTag = githubEntries[0]?.tag;
        if (latestTag) {
            await setMemory(AGENT_ID, 'last_processed_tag_github', latestTag, 'private');
        }
    }

    if (communityEntries.length > 0) {
        const latestPostId = communityEntries[0]?.postId;
        if (latestPostId) {
            await setMemory(AGENT_ID, 'last_processed_post_reddit', latestPostId, 'private');
        }
    }

    // Update shared state
    await Promise.all([
        setMemory(AGENT_ID, 'last_monitor_at', now, 'shared'),
        setMemory(AGENT_ID, 'last_task_completed', 'research-cycle', 'shared'),
        setMemory(AGENT_ID, 'last_task_at', now, 'shared'),
        setMemory(AGENT_ID, 'sources_health', sourcesStatus, 'shared'),
        setMemory(AGENT_ID, 'latest_research_report', {
            report_id: reportId,
            generated_at: now,
            total_filtered: filtered.length,
            summary,
            top_items: filtered.slice(0, 5).map(e => ({
                title: e.title,
                source: e.source,
                impact: e.impact,
                score: e.relevance_score,
            })),
        }, 'shared'),
    ]);

    // Update run counter
    const totalRunsRes = await getMemory(AGENT_ID, 'total_runs');
    const totalRuns = (totalRunsRes?.value || 0) + 1;
    await setMemory(AGENT_ID, 'total_runs', totalRuns, 'private');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`=== Research Agent: Cycle Complete (${elapsed}s) ===`);

    return report;
}

/**
 * Generate a markdown report from structured data.
 */
function generateMarkdown(report) {
    const lines = [
        `# Research Intelligence Report`,
        ``,
        `**Generated:** ${report.generated_at}`,
        `**Sources:** ${report.sources_checked.join(', ')}`,
        `**Raw entries:** ${report.total_raw} | **Filtered:** ${report.total_filtered}`,
        ``,
        `## Summary`,
        `| Impact | Count |`,
        `|--------|-------|`,
        `| High | ${report.summary.high} |`,
        `| Medium | ${report.summary.medium} |`,
        `| Low | ${report.summary.low} |`,
        ``,
        `## Sources Status`,
    ];

    for (const [source, status] of Object.entries(report.sources_status)) {
        lines.push(`- **${source}:** ${status}`);
    }

    lines.push('', '## Novelties');

    if (report.novelties.length === 0) {
        lines.push('', '_No new relevant entries detected._');
    } else {
        for (const entry of report.novelties) {
            lines.push(
                '',
                `### [${entry.impact.toUpperCase()}] ${entry.title}`,
                `- **Source:** ${entry.source}`,
                `- **Date:** ${entry.date || 'N/A'}`,
                `- **Score:** ${entry.relevance_score} | **Keywords:** ${entry.matched_keywords.join(', ')}`,
                `- **URL:** ${entry.url}`,
            );
            if (entry.summary) {
                lines.push(`- **Summary:** ${entry.summary.substring(0, 300)}`);
            }
        }
    }

    return lines.join('\n');
}

// ─── CLI ────────────────────────────────────────────────────────────────────
const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('orchestrator.js');
if (isDirectRun) {
    runResearchCycle()
        .then(report => {
            console.log(`\nReport: ${report.total_filtered} entries, summary:`, report.summary);
        })
        .catch(err => {
            console.error('[Research] Fatal error:', err.message);
            process.exit(1);
        })
        .finally(() => pool.end());
}
