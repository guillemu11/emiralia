#!/usr/bin/env node
import pool from './pool.js';

async function fixSequences() {
  const client = await pool.connect();
  try {
    console.log('🔧 Fixing database sequences...\n');

    // Fix projects sequence
    const projectsResult = await client.query(`
      SELECT setval('projects_id_seq',
        (SELECT COALESCE(MAX(id), 0) + 1 FROM projects),
        false
      )
    `);
    const newProjectsSeq = projectsResult.rows[0].setval;
    console.log(`✅ projects_id_seq reset to: ${newProjectsSeq}`);

    // Fix agents sequence (si existe)
    try {
      const agentsResult = await client.query(`
        SELECT setval('agents_id_seq',
          (SELECT COALESCE(MAX(id), 0) + 1 FROM agents),
          false
        )
      `);
      const newAgentsSeq = agentsResult.rows[0].setval;
      console.log(`✅ agents_id_seq reset to: ${newAgentsSeq}`);
    } catch (err) {
      console.log(`⚠️  agents table or sequence not found (skipping)`);
    }

    // Fix properties sequence (si existe)
    try {
      const propsResult = await client.query(`
        SELECT setval('properties_id_seq',
          (SELECT COALESCE(MAX(id), 0) + 1 FROM properties),
          false
        )
      `);
      const newPropsSeq = propsResult.rows[0].setval;
      console.log(`✅ properties_id_seq reset to: ${newPropsSeq}`);
    } catch (err) {
      console.log(`⚠️  properties table or sequence not found (skipping)`);
    }

    console.log('\n✅ All sequences fixed successfully');
  } catch (error) {
    console.error('❌ Error fixing sequences:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixSequences();
