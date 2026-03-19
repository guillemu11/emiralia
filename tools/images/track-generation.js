/**
 * Database tracking for AI-generated images
 *
 * Logs image generation history for analytics and cost management
 */

import pool from '../db/pool.js';

/**
 * Track image generation in database
 *
 * @param {Object} imageData - Image generation result
 * @param {string} imageData.filename - Image filename
 * @param {string} imageData.prompt - Generation prompt
 * @param {string} imageData.model - AI model used
 * @param {string} imageData.size - Image dimensions
 * @param {string} imageData.path - File system path
 * @param {string} imageData.url - Public URL
 * @param {string} imageData.generatedBy - Source (telegram, api, cli)
 * @param {number} imageData.estimatedCost - Estimated cost in USD
 * @returns {Promise<number>} Inserted record ID
 */
export async function trackGeneration(imageData) {
  try {
    const result = await pool.query(
      `INSERT INTO generated_images
       (filename, prompt, model, size, file_path, public_url, generated_by, cost_usd)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        imageData.filename,
        imageData.prompt,
        imageData.model || 'gemini-flash-image',
        imageData.size,
        imageData.path,
        imageData.url,
        imageData.generatedBy || 'unknown',
        imageData.estimatedCost || 0.001
      ]
    );

    console.log(`[Track] ✓ Logged generation #${result.rows[0].id}`);
    return result.rows[0].id;

  } catch (error) {
    console.error('[Track] Failed to log generation:', error.message);
    // Don't throw - tracking failure shouldn't break generation
    return null;
  }
}

/**
 * Get recent generated images
 *
 * @param {number} limit - Max number of records
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} Generated images
 */
export async function getRecentGenerations(limit = 20, offset = 0) {
  const result = await pool.query(
    `SELECT id, filename, prompt, model, size, public_url, generated_by, generated_at, cost_usd
     FROM generated_images
     ORDER BY generated_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return result.rows;
}

/**
 * Get generation statistics
 *
 * @returns {Promise<Object>} Usage stats
 */
export async function getGenerationStats() {
  const result = await pool.query(
    `SELECT
       COUNT(*) as total,
       SUM(cost_usd) as total_cost,
       COUNT(DISTINCT generated_by) as unique_users,
       MIN(generated_at) as first_generation,
       MAX(generated_at) as last_generation
     FROM generated_images`
  );

  return result.rows[0];
}

/**
 * Get top users by generation count
 *
 * @param {number} limit - Number of top users
 * @returns {Promise<Array>} Top users
 */
export async function getTopUsers(limit = 10) {
  const result = await pool.query(
    `SELECT generated_by, COUNT(*) as count, SUM(cost_usd) as total_cost
     FROM generated_images
     GROUP BY generated_by
     ORDER BY count DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows;
}
