import pg from 'pg';
import 'dotenv/config';
import { trackSkill } from './workspace-skills/skill-tracker.js';

const { Pool } = pg;

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5433', 10), // Note: .env says 5433
    database: process.env.PG_DB || 'emiralia',
    user: process.env.PG_USER || 'emiralia',
    password: process.env.PG_PASSWORD || 'changeme',
});

async function checkTables() {
    trackSkill('data-agent', 'check-db-full', 'data', 'completed').catch(() => {});
    try {
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Tables:', res.rows.map(r => r.table_name));

        if (res.rows.some(r => r.table_name === 'properties')) {
            const countRes = await pool.query('SELECT COUNT(*) FROM properties');
            console.log(`Count in properties: ${countRes.rows[0].count}`);
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkTables();
