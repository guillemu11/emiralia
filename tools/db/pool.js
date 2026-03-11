/**
 * Emiralia — Shared PostgreSQL Pool
 *
 * Single connection pool used across all tools and workspace-skills.
 * Import this instead of creating your own pg.Pool().
 */

import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5433', 10),
    database: process.env.PG_DB || 'emiralia',
    user: process.env.PG_USER || 'emiralia',
    password: process.env.PG_PASSWORD || 'changeme',
    ssl: process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: false }
});

export default pool;
