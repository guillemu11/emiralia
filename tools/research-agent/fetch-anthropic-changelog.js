/**
 * Emiralia Research Agent — Anthropic Changelog Fetcher
 *
 * Fetches recent updates from Anthropic's documentation/changelog.
 * Returns structured entries for the relevance filter.
 *
 * Usage:
 *   import { fetchAnthropicChangelog } from './fetch-anthropic-changelog.js';
 *   const entries = await fetchAnthropicChangelog({ lastProcessedDate });
 */

import axios from 'axios';
import { trackSkill } from '../workspace-skills/skill-tracker.js';

const URLS = [
    'https://docs.anthropic.com/en/docs/about-claude/models',
    'https://docs.anthropic.com/en/docs/changelog',
];

/**
 * Fetch and parse Anthropic documentation pages for recent changes.
 * @param {Object} opts
 * @param {string} [opts.lastProcessedDate] - ISO date string to skip older entries
 * @returns {Promise<Array<{title: string, date: string, summary: string, source: string, url: string}>>}
 */
export async function fetchAnthropicChangelog({ lastProcessedDate } = {}) {
    trackSkill('dev-agent', 'fetch-anthropic-changelog', 'ops', 'completed').catch(() => {});
    const entries = [];

    for (const url of URLS) {
        try {
            const { data: html } = await axios.get(url, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Emiralia-Research-Agent/1.0',
                    'Accept': 'text/html',
                },
            });

            const parsed = parseChangelogHtml(html, url);
            entries.push(...parsed);
        } catch (err) {
            console.warn(`[Research] Anthropic fetch failed for ${url}: ${err.message}`);
        }
    }

    // Dedup: skip entries older than lastProcessedDate
    if (lastProcessedDate) {
        const cutoff = new Date(lastProcessedDate);
        return entries.filter(e => !e.date || new Date(e.date) > cutoff);
    }

    return entries;
}

/**
 * Parse HTML content looking for changelog-like patterns.
 * Looks for date headers (YYYY-MM-DD or Month DD, YYYY) followed by content.
 */
function parseChangelogHtml(html, url) {
    const entries = [];

    // Strip HTML tags for text analysis
    const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n{3,}/g, '\n\n');

    // Pattern 1: ISO dates (2024-01-15)
    const isoDatePattern = /(\d{4}-\d{2}-\d{2})\s*[:\-—]\s*(.+?)(?=\n\d{4}-\d{2}-\d{2}|\n\n|$)/gs;
    let match;
    while ((match = isoDatePattern.exec(text)) !== null) {
        const [, date, content] = match;
        const title = content.trim().split('\n')[0].substring(0, 200);
        if (title.length > 10) {
            entries.push({
                title,
                date,
                summary: content.trim().substring(0, 500),
                source: 'anthropic-docs',
                url,
            });
        }
    }

    // Pattern 2: "Month DD, YYYY" headers
    const monthDatePattern = /((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\s*[:\-—]?\s*(.+?)(?=(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}|\n\n|$)/gis;
    while ((match = monthDatePattern.exec(text)) !== null) {
        const [, dateStr, content] = match;
        const date = new Date(dateStr).toISOString().split('T')[0];
        const title = content.trim().split('\n')[0].substring(0, 200);
        if (title.length > 10 && !isNaN(new Date(dateStr).getTime())) {
            entries.push({
                title,
                date,
                summary: content.trim().substring(0, 500),
                source: 'anthropic-docs',
                url,
            });
        }
    }

    // If no dated entries found, extract page title as a generic entry
    if (entries.length === 0) {
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) {
            entries.push({
                title: titleMatch[1].trim(),
                date: new Date().toISOString().split('T')[0],
                summary: `Page content from ${url} (no dated entries detected)`,
                source: 'anthropic-docs',
                url,
            });
        }
    }

    return entries;
}

// ─── CLI ────────────────────────────────────────────────────────────────────
const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('fetch-anthropic-changelog.js');
if (isDirectRun) {
    const lastDate = process.argv[2] || null;
    console.log(`[Research] Fetching Anthropic changelog${lastDate ? ` since ${lastDate}` : ''}...`);
    fetchAnthropicChangelog({ lastProcessedDate: lastDate })
        .then(entries => {
            console.log(`[Research] Found ${entries.length} entries`);
            console.log(JSON.stringify(entries, null, 2));
        })
        .catch(err => {
            console.error('[Research] Error:', err.message);
            process.exit(1);
        });
}
