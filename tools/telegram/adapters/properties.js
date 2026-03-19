/**
 * Properties CRUD Adapter (Read-Only)
 *
 * Adapter for read-only operations on properties table.
 * Write operations must come from scraper tools.
 */

import pool from '../../db/pool.js';

/**
 * Create - NOT ALLOWED
 */
export async function create() {
  throw new Error('Properties cannot be created via CRUD - use scraper tools');
}

/**
 * Read a property by ID
 */
export async function read(id) {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT * FROM properties WHERE id = $1
    `, [id]);

    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Update - NOT ALLOWED
 */
export async function update() {
  throw new Error('Properties are read-only - updates must come from scraper');
}

/**
 * Delete - NOT ALLOWED
 */
export async function deleteProperty() {
  throw new Error('Properties cannot be deleted - they are archived automatically');
}

/**
 * List properties with filters
 */
export async function list(filters = {}) {
  const client = await pool.connect();

  try {
    let query = 'SELECT * FROM properties WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Apply filters
    if (filters.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.location) {
      query += ` AND location ILIKE $${paramIndex}`;
      params.push(`%${filters.location}%`);
      paramIndex++;
    }

    if (filters.developer) {
      query += ` AND developer ILIKE $${paramIndex}`;
      params.push(`%${filters.developer}%`);
      paramIndex++;
    }

    if (filters.min_price) {
      query += ` AND price >= $${paramIndex}`;
      params.push(parseFloat(filters.min_price));
      paramIndex++;
    }

    if (filters.max_price) {
      query += ` AND price <= $${paramIndex}`;
      params.push(parseFloat(filters.max_price));
      paramIndex++;
    }

    if (filters.bedrooms) {
      query += ` AND bedrooms = $${paramIndex}`;
      params.push(parseInt(filters.bedrooms));
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
  delete: deleteProperty,
  list
};
