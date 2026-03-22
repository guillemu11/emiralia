/**
 * Temporary script to check agents in database
 */
import pool from './pool.js';

async function checkAgents() {
  try {
    const result = await pool.query(`
      SELECT id, name, role, department FROM agents ORDER BY id;
    `);

    console.log('Agents in database:');
    console.table(result.rows);

    if (result.rows.length === 0) {
      console.log('\n⚠️ No agents found in database!');
    }

    await pool.end();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkAgents();
