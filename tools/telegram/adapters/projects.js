/**
 * Projects CRUD Adapter
 *
 * Adapter for CRUD operations on projects table.
 */

import pool from '../../db/pool.js';

/**
 * Create a new project
 */
export async function create(data, userId) {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      INSERT INTO projects (
        name,
        problem,
        solution,
        status,
        department,
        sub_area,
        estimated_timeline,
        estimated_budget,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      data.name,
      data.problem || null,
      data.solution || null,
      data.status || 'planning',
      data.department || null,
      data.sub_area || null,
      data.estimated_timeline || null,
      data.estimated_budget || null,
      userId
    ]);

    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Read a project by ID
 */
export async function read(id) {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT * FROM projects WHERE id = $1
    `, [id]);

    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Update a project
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
      UPDATE projects
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
 * Delete a project (soft delete by setting status to 'cancelled')
 */
export async function deleteProject(id) {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      UPDATE projects
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `, [id]);

    return result.rows[0] ? { deleted: true, id, resourceId: id } : { deleted: false };
  } finally {
    client.release();
  }
}

/**
 * List projects with filters
 */
export async function list(filters = {}) {
  const client = await pool.connect();

  try {
    let query = 'SELECT * FROM projects WHERE 1=1';
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

    if (filters.priority) {
      query += ` AND priority = $${paramIndex}`;
      params.push(filters.priority);
      paramIndex++;
    }

    if (filters.created_by) {
      query += ` AND created_by = $${paramIndex}`;
      params.push(filters.created_by);
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
  delete: deleteProject,
  list
};
