import axios from 'axios';
import 'dotenv/config';
import { trackSkill } from './workspace-skills/skill-tracker.js';

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = 'dhrumil/propertyfinder-scraper';
const APIFY_BASE = 'https://api.apify.com/v2';

async function findLastRun() {
    trackSkill('data-agent', 'find-last-apify-run', 'data', 'completed').catch(() => {});
    if (!APIFY_TOKEN) {
        console.error('❌ APIFY_TOKEN no está definido');
        return;
    }

    try {
        const res = await axios.get(
            `${APIFY_BASE}/acts/${encodeURIComponent(ACTOR_ID)}/runs`,
            {
                params: {
                    token: APIFY_TOKEN,
                    limit: 5,
                    desc: true
                }
            }
        );

        const runs = res.data.data.items;
        console.log('Last 5 runs:');
        runs.forEach(run => {
            console.log(`- ID: ${run.id} | Status: ${run.status} | Started: ${run.startedAt}`);
        });

        if (runs.length > 0) {
            console.log(`\nMost recent run: ${runs[0].id}`);
        }
    } catch (err) {
        console.error('Error finding runs:', err.message);
    }
}

findLastRun();
