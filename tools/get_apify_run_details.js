import axios from 'axios';
import 'dotenv/config';
import { trackSkill } from './workspace-skills/skill-tracker.js';

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const APIFY_BASE = 'https://api.apify.com/v2';

async function getRunDetails(runId) {
    trackSkill('data-agent', 'get-apify-run-details', 'data', 'completed').catch(() => {});
    if (!APIFY_TOKEN) return;

    try {
        const res = await axios.get(
            `${APIFY_BASE}/actor-runs/${runId}`,
            { params: { token: APIFY_TOKEN } }
        );
        const run = res.data.data;
        console.log(`Run ID: ${run.id}`);
        console.log(`Status: ${run.status}`);
        console.log(`Dataset ID: ${run.defaultDatasetId}`);
        console.log(`Usage: ${JSON.stringify(run.usageTotalUsd)} USD`);

        const datasetsRes = await axios.get(
            `${APIFY_BASE}/datasets/${run.defaultDatasetId}`,
            { params: { token: APIFY_TOKEN } }
        );
        console.log(`Item count: ${datasetsRes.data.data.itemCount}`);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

const runId = process.argv[2] || 'H4HSrAPlsKG2iT68H';
getRunDetails(runId);
