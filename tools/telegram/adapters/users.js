/**
 * Telegram Users CRUD Adapter
 *
 * Adapter for CRUD operations on telegram_users table.
 * Uses existing telegram_user_queries.js functions.
 */

import {
  getUser,
  upsertUser,
  setAuthorization,
  listAuthorizedUsers
} from '../../db/telegram_user_queries.js';

import pool from '../../db/pool.js';

/**
 * Create - NOT ALLOWED (users are auto-created via middleware)
 */
export async function create() {
  throw new Error('Telegram users are auto-created on first interaction');
}

/**
 * Read a telegram user by user_id
 */
export async function read(userId) {
  return await getUser(userId);
}

/**
 * Update a telegram user (admin only)
 */
export async function update(userId, data) {
  const client = await pool.connect();

  try {
    // Build dynamic SET clause
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Only allow updating certain fields
    const allowedFields = ['username', 'first_name', 'last_name', 'language_code', 'active_agent_id', 'is_authorized', 'role'];

    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Add last_interaction_at
    fields.push(`last_interaction_at = NOW()`);

    // Add user_id to values
    values.push(userId);

    const query = `
      UPDATE telegram_users
      SET ${fields.join(', ')}
      WHERE user_id = $${paramIndex}
      RETURNING *
    `;

    const result = await client.query(query, values);

    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Delete - NOT ALLOWED
 */
export async function deleteUser() {
  throw new Error('Telegram users cannot be deleted - use is_authorized=false instead');
}

/**
 * List telegram users with filters
 */
export async function list(filters = {}) {
  const client = await pool.connect();

  try {
    let query = 'SELECT * FROM telegram_users WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Apply filters
    if (filters.is_authorized !== undefined) {
      query += ` AND is_authorized = $${paramIndex}`;
      params.push(filters.is_authorized);
      paramIndex++;
    }

    if (filters.role) {
      query += ` AND role = $${paramIndex}`;
      params.push(filters.role);
      paramIndex++;
    }

    if (filters.active_agent_id) {
      query += ` AND active_agent_id = $${paramIndex}`;
      params.push(filters.active_agent_id);
      paramIndex++;
    }

    // Order by last_interaction_at desc
    query += ' ORDER BY last_interaction_at DESC LIMIT 50';

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
  delete: deleteUser,
  list
};
