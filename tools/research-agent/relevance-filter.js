/**
 * Emiralia Research Agent — Relevance Filter
 *
 * Scores and classifies raw entries from fetchers by keyword relevance.
 * Entries below minimum threshold are discarded.
 *
 * Usage:
 *   import { filterByRelevance } from './relevance-filter.js';
 *   const filtered = filterByRelevance(entries);
 */

import { trackSkill } from '../workspace-skills/skill-tracker.js';

// Keywords with weights — higher = more relevant to Emiralia WAT
const KEYWORDS = {
    'claude code': 10,
    'claude-code': 10,
    'mcp': 9,
    'model context protocol': 9,
    'tool use': 8,
    'tool_use': 8,
    'anthropic': 8,
    'agents': 6,
    'agent': 6,
    'claude': 5,
    'sdk': 5,
    'api': 4,
    'prompt': 4,
    'context window': 7,
    'system prompt': 7,
    'function calling': 7,
    'streaming': 4,
    'batch': 4,
    'vision': 5,
    'multimodal': 5,
    'opus': 6,
    'sonnet': 6,
    'haiku': 6,
    'extended thinking': 7,
    'computer use': 6,
    'artifacts': 5,
    'projects': 4,
    'memory': 5,
    'skills': 5,
    'hooks': 6,
    'slash command': 6,
    'frontmatter': 7,
    'allowed-tools': 7,
    'context fork': 7,
    'breaking change': 9,
    'deprecat': 8,
    'removed': 7,
    'migration': 6,
};

// Source boost: official sources get priority
const SOURCE_BOOST = {
    'anthropic-docs': 5,
    'github-releases': 5,
    'reddit-r/ClaudeAI': 0,
};

const MIN_SCORE = 3;

/**
 * Filter and score entries by keyword relevance.
 * @param {Array<{title: string, summary: string, source: string, [key: string]: any}>} entries
 * @returns {Array<Object>} Enriched entries with relevance_score, impact, matched_keywords
 */
export function filterByRelevance(entries) {
    trackSkill('dev-agent', 'relevance-filter', 'ops', 'completed').catch(() => {});
    if (!Array.isArray(entries) || entries.length === 0) return [];

    const scored = entries.map(entry => {
        const text = `${entry.title} ${entry.summary}`.toLowerCase();
        const matchedKeywords = [];
        let score = 0;

        for (const [keyword, weight] of Object.entries(KEYWORDS)) {
            if (text.includes(keyword.toLowerCase())) {
                score += weight;
                matchedKeywords.push(keyword);
            }
        }

        // Apply source boost
        score += SOURCE_BOOST[entry.source] || 0;

        // Classify impact
        let impact;
        if (score >= 15) impact = 'high';
        else if (score >= 8) impact = 'medium';
        else impact = 'low';

        return {
            ...entry,
            relevance_score: score,
            impact,
            matched_keywords: matchedKeywords,
        };
    });

    // Filter below minimum and sort by score descending
    return scored
        .filter(e => e.relevance_score >= MIN_SCORE)
        .sort((a, b) => b.relevance_score - a.relevance_score);
}

/**
 * Generate summary stats from filtered entries.
 * @param {Array<Object>} filtered
 * @returns {{high: number, medium: number, low: number, total: number}}
 */
export function summarizeResults(filtered) {
    return {
        high: filtered.filter(e => e.impact === 'high').length,
        medium: filtered.filter(e => e.impact === 'medium').length,
        low: filtered.filter(e => e.impact === 'low').length,
        total: filtered.length,
    };
}
