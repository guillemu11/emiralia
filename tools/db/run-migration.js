/**
 * Run migration script using pg pool
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigration(migrationFile) {
  try {
    const sqlPath = path.join(__dirname, migrationFile);
    const sql = await fs.readFile(sqlPath, 'utf-8');

    console.log(`Running migration: ${migrationFile}`);

    await pool.query(sql);

    console.log('✓ Migration complete!');

    // Verify table was created
    const result = await pool.query(
      `SELECT COUNT(*) FROM generated_images`
    );

    console.log(`✓ Verified: generated_images table exists (${result.rows[0].count} rows)`);

  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration
const migrationFile = process.argv[2] || 'migration_generated_images.sql';
runMigration(migrationFile);
