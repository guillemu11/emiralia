/**
 * Check agent_conversations table
 */
import pool from './pool.js';

async function checkConversations() {
  try {
    // Check table structure
    const tableInfo = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'agent_conversations'
      ORDER BY ordinal_position;
    `);

    console.log('Table structure:');
    console.table(tableInfo.rows);

    // Check data
    const data = await pool.query(`
      SELECT id, agent_id, user_id, channel,
             jsonb_array_length(messages) as message_count,
             created_at, last_message_at
      FROM agent_conversations
      ORDER BY last_message_at DESC
      LIMIT 10;
    `);

    console.log('\nConversations:');
    console.table(data.rows);

    await pool.end();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkConversations();
