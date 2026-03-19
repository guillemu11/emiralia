/**
 * Agent Memory CRUD Adapter
 *
 * Adapter for CRUD operations on agent_memory table.
 * Interfaces with existing memory.js tool.
 */

import pool from '../../db/pool.js';

/**
 * Create or update memory (UPSERT)
 */
export async function create(data, userId) {
  const client = await pool.connect();

  try {
    const { key, value, scope = 'private' } = data;

    // agent_id must be provided in data or derived from context
    const agentId = data.agent_id;
    if (!agentId) {
      throw new Error('agent_id is required for memory operations');
    }

    const result = await client.query(`
      INSERT INTO agent_memory (agent_id, key, value, scope)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (agent_id, key)
      DO UPDATE SET
        value = EXCLUDED.value,
        scope = EXCLUDED.scope,
        updated_at = NOW()
      RETURNING *
    `, [agentId, key, JSON.stringify(value), scope]);

    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Read memory by key
 * Note: For memory, id parameter is actually the key, and we need agent_id from context
 */
export async function read(key, agentId) {
  if (!agentId) {
    throw new Error('agent_id is required to read memory');
  }

  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT * FROM agent_memory
      WHERE agent_id = $1 AND key = $2
    `, [agentId, key]);

    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Update memory (same as create due to UPSERT)
 */
export async function update(key, data, agentId) {
  if (!agentId) {
    throw new Error('agent_id is required to update memory');
  }

  const client = await pool.connect();

  try {
    const { value, scope } = data;

    const result = await client.query(`
      UPDATE agent_memory
      SET
        value = $1,
        scope = $2,
        updated_at = NOW()
      WHERE agent_id = $3 AND key = $4
      RETURNING *
    `, [JSON.stringify(value), scope || 'private', agentId, key]);

    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Delete memory
 */
export async function deleteMemory(key, agentId) {
  if (!agentId) {
    throw new Error('agent_id is required to delete memory');
  }

  const client = await pool.connect();

  try {
    const result = await client.query(`
      DELETE FROM agent_memory
      WHERE agent_id = $1 AND key = $2
      RETURNING id
    `, [agentId, key]);

    return result.rows[0] ? { deleted: true, id: key, resourceId: key } : { deleted: false };
  } finally {
    client.release();
  }
}

/**
 * List memory for an agent
 */
export async function list(filters = {}) {
  const client = await pool.connect();

  try {
    let query = 'SELECT * FROM agent_memory WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Apply filters
    if (filters.agent_id) {
      query += ` AND agent_id = $${paramIndex}`;
      params.push(filters.agent_id);
      paramIndex++;
    }

    if (filters.scope) {
      query += ` AND scope = $${paramIndex}`;
      params.push(filters.scope);
      paramIndex++;
    }

    if (filters.key) {
      query += ` AND key ILIKE $${paramIndex}`;
      params.push(`%${filters.key}%`);
      paramIndex++;
    }

    // Order by updated_at desc
    query += ' ORDER BY updated_at DESC LIMIT 50';

    const result = await client.query(query, params);

    return result.rows;
  } finally {
    client.release();
  }
}

export default {
  create,
  read,
  update,
  delete: deleteMemory,
  list
};
