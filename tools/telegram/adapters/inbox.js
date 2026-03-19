/**
 * Inbox Items CRUD Adapter
 *
 * Adapter for CRUD operations on inbox_items table.
 */

import pool from '../../db/pool.js';

/**
 * Create a new inbox item
 */
export async function create(data, userId) {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      INSERT INTO inbox_items (
        title,
        description,
        status,
        department,
        summary,
        conversation,
        structured_data,
        project_id,
        weekly_session_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      data.title,
      data.description || null,
      data.status || 'new',
      data.department || null,
      data.summary || null,
      data.conversation || null,
      data.structured_data ? JSON.stringify(data.structured_data) : null,
      data.project_id || null,
      data.weekly_session_id || null
    ]);

    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Read an inbox item by ID
 */
export async function read(id) {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT * FROM inbox_items WHERE id = $1
    `, [id]);

    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Update an inbox item
 */
export async function update(id, data) {
  const client = await pool.connect();

  try {
    // Build dynamic SET clause
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(data)) {
      // Handle JSON fields
      if (key === 'structured_data' && typeof value === 'object') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    // Add updated_at
    fields.push(`updated_at = NOW()`);

    // Add id to values
    values.push(id);

    const query = `
      UPDATE inbox_items
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await client.query(query, values);

    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Delete an inbox item
 */
export async function deleteInboxItem(id) {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      DELETE FROM inbox_items WHERE id = $1 RETURNING id
    `, [id]);

    return result.rows[0] ? { deleted: true, id, resourceId: id } : { deleted: false };
  } finally {
    client.release();
  }
}

/**
 * List inbox items with filters
 */
export async function list(filters = {}) {
  const client = await pool.connect();

  try {
    let query = 'SELECT * FROM inbox_items WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Apply filters
    if (filters.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.department) {
      query += ` AND department = $${paramIndex}`;
      params.push(filters.department);
      paramIndex++;
    }

    if (filters.project_id) {
      query += ` AND project_id = $${paramIndex}`;
      params.push(filters.project_id);
      paramIndex++;
    }

    if (filters.weekly_session_id) {
      query += ` AND weekly_session_id = $${paramIndex}`;
      params.push(filters.weekly_session_id);
      paramIndex++;
    }

    // Order by created_at desc
    query += ' ORDER BY created_at DESC LIMIT 50';

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
  delete: deleteInboxItem,
  list
};
