/**
 * Tasks CRUD Adapter
 *
 * Adapter for CRUD operations on tasks table.
 */

import pool from '../../db/pool.js';

/**
 * Create a new task
 */
export async function create(data, userId) {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      INSERT INTO tasks (
        description,
        agent,
        effort,
        status,
        priority,
        type,
        dependencies,
        phase_id,
        project_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      data.description,
      data.agent || null,
      data.effort || null,
      data.status || 'pending',
      data.priority || 'medium',
      data.type || null,
      data.dependencies || null,
      data.phase_id || null,
      data.project_id || null
    ]);

    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Read a task by ID
 */
export async function read(id) {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT * FROM tasks WHERE id = $1
    `, [id]);

    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Update a task
 */
export async function update(id, data) {
  const client = await pool.connect();

  try {
    // Build dynamic SET clause
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
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
      UPDATE tasks
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
 * Delete a task
 */
export async function deleteTask(id) {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      DELETE FROM tasks WHERE id = $1 RETURNING id
    `, [id]);

    return result.rows[0] ? { deleted: true, id, resourceId: id } : { deleted: false };
  } finally {
    client.release();
  }
}

/**
 * List tasks with filters
 */
export async function list(filters = {}) {
  const client = await pool.connect();

  try {
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Apply filters
    if (filters.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.agent) {
      query += ` AND agent = $${paramIndex}`;
      params.push(filters.agent);
      paramIndex++;
    }

    if (filters.priority) {
      query += ` AND priority = $${paramIndex}`;
      params.push(filters.priority);
      paramIndex++;
    }

    if (filters.type) {
      query += ` AND type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }

    if (filters.project_id) {
      query += ` AND project_id = $${paramIndex}`;
      params.push(filters.project_id);
      paramIndex++;
    }

    if (filters.phase_id) {
      query += ` AND phase_id = $${paramIndex}`;
      params.push(filters.phase_id);
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
  delete: deleteTask,
  list
};
