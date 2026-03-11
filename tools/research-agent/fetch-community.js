/**
 * Emiralia Research Agent — Community Fetcher (Reddit)
 *
 * Fetches hot posts from r/ClaudeAI via Reddit's public JSON API.
 * This is a secondary source — failures do not block the research cycle.
 *
 * Usage:
 *   import { fetchCommunity } from './fetch-community.js';
 *   const entries = await fetchCommunity({ lastPostId });
 */

import axios from 'axios';
import { trackSkill } from '../workspace-skills/skill-tracker.js';

const SUBREDDIT_URL = 'https://www.reddit.com/r/ClaudeAI/hot.json';
const MIN_SCORE = 5;

/**
 * Fetch hot posts from r/ClaudeAI.
 * @param {Object} opts
 * @param {string} [opts.lastPostId] - Skip posts at or before this Reddit post ID
 * @param {number} [opts.limit=25] - Number of posts to fetch
 * @returns {Promise<Array<{title: string, date: string, summary: string, source: string, url: string, postId: string, score: number}>>}
 */
export async function fetchCommunity({ lastPostId, limit = 25 } = {}) {
    trackSkill('dev-agent', 'fetch-community', 'ops', 'completed').catch(() => {});
    try {
        const { data } = await axios.get(SUBREDDIT_URL, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Emiralia-Research-Agent/1.0 (research bot)',
            },
            params: { limit },
        });

        if (!data?.data?.children) {
            console.warn('[Research] Reddit API returned unexpected format');
            return [];
        }

        let entries = data.data.children
            .map(child => child.data)
            .filter(post => post.score >= MIN_SCORE && !post.stickied)
            .map(post => ({
                title: post.title,
                date: new Date(post.created_utc * 1000).toISOString().split('T')[0],
                summary: (post.selftext || '').substring(0, 500) || `Score: ${post.score}, Comments: ${post.num_comments}`,
                source: 'reddit-r/ClaudeAI',
                url: `https://reddit.com${post.permalink}`,
                postId: post.id,
                score: post.score,
            }));

        // Dedup: skip posts at or before lastPostId
        if (lastPostId) {
            const idx = entries.findIndex(e => e.postId === lastPostId);
            if (idx !== -1) {
                entries = entries.slice(0, idx);
            }
        }

        return entries;
    } catch (err) {
        console.warn(`[Research] Reddit fetch failed: ${err.message}`);
        return [];
    }
}

// ─── CLI ────────────────────────────────────────────────────────────────────
const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('fetch-community.js');
if (isDirectRun) {
    const lastId = process.argv[2] || null;
    console.log(`[Research] Fetching Reddit r/ClaudeAI${lastId ? ` since post ${lastId}` : ''}...`);
    fetchCommunity({ lastPostId: lastId })
        .then(entries => {
            console.log(`[Research] Found ${entries.length} relevant posts`);
            console.log(JSON.stringify(entries, null, 2));
        })
        .catch(err => {
            console.error('[Research] Error:', err.message);
            process.exit(1);
        });
}
