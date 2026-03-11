import pg from 'pg';
import 'dotenv/config';
import { trackSkill } from './workspace-skills/skill-tracker.js';

const { Pool } = pg;

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432', 10),
    database: process.env.PG_DB || 'emiralia',
    user: process.env.PG_USER || 'emiralia',
    password: process.env.PG_PASSWORD || 'changeme',
});

async function checkDb() {
    trackSkill('data-agent', 'check-db-count', 'data', 'completed').catch(() => {});
    try {
        const res = await pool.query('SELECT COUNT(*) FROM properties');
        console.log(`Total properties in DB: ${res.rows[0].count}`);
    } catch (err) {
        console.error('Error checking DB:', err.message);
    } finally {
        await pool.end();
    }
}

checkDb();
