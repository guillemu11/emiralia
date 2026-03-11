/**
 * Emiralia Research Agent — GitHub Releases Fetcher
 *
 * Fetches recent releases from anthropics/claude-code repository.
 * Uses GitHub public API (no auth required, optional GITHUB_TOKEN for rate limits).
 *
 * Usage:
 *   import { fetchGithubReleases } from './fetch-github-releases.js';
 *   const entries = await fetchGithubReleases({ lastProcessedTag });
 */

import axios from 'axios';
import { trackSkill } from '../workspace-skills/skill-tracker.js';

const REPO = 'anthropics/claude-code';
const API_URL = `https://api.github.com/repos/${REPO}/releases`;

/**
 * Fetch recent releases from GitHub.
 * @param {Object} opts
 * @param {string} [opts.lastProcessedTag] - Skip releases at or before this tag
 * @param {number} [opts.perPage=10] - Number of releases to fetch
 * @returns {Promise<Array<{title: string, date: string, summary: string, source: string, url: string, tag: string}>>}
 */
export async function fetchGithubReleases({ lastProcessedTag, perPage = 10 } = {}) {
    trackSkill('dev-agent', 'fetch-github-releases', 'ops', 'completed').catch(() => {});
    const headers = {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Emiralia-Research-Agent/1.0',
    };

    // Optional auth for higher rate limits
    if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    try {
        const { data: releases } = await axios.get(API_URL, {
            timeout: 15000,
            headers,
            params: { per_page: perPage },
        });

        if (!Array.isArray(releases)) {
            console.warn('[Research] GitHub API returned non-array response');
            return [];
        }

        let entries = releases.map(release => ({
            title: release.name || release.tag_name,
            date: release.published_at?.split('T')[0] || release.created_at?.split('T')[0],
            summary: (release.body || '').substring(0, 500),
            source: 'github-releases',
            url: release.html_url,
            tag: release.tag_name,
        }));

        // Dedup: skip entries at or before lastProcessedTag
        if (lastProcessedTag) {
            const idx = entries.findIndex(e => e.tag === lastProcessedTag);
            if (idx !== -1) {
                entries = entries.slice(0, idx);
            }
        }

        return entries;
    } catch (err) {
        console.warn(`[Research] GitHub fetch failed: ${err.message}`);
        return [];
    }
}

// ─── CLI ────────────────────────────────────────────────────────────────────
const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('fetch-github-releases.js');
if (isDirectRun) {
    const lastTag = process.argv[2] || null;
    console.log(`[Research] Fetching GitHub releases${lastTag ? ` since ${lastTag}` : ''}...`);
    fetchGithubReleases({ lastProcessedTag: lastTag })
        .then(entries => {
            console.log(`[Research] Found ${entries.length} releases`);
            console.log(JSON.stringify(entries, null, 2));
        })
        .catch(err => {
            console.error('[Research] Error:', err.message);
            process.exit(1);
        });
}
