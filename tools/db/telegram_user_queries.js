/**
 * Telegram User Queries
 *
 * Helper functions para gestionar usuarios de Telegram
 *
 * Uso:
 *   import { getUser, upsertUser, ... } from './telegram_user_queries.js';
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5433'),
  database: process.env.PG_DB || 'emiralia',
  user: process.env.PG_USER || 'emiralia',
  password: process.env.PG_PASSWORD || 'changeme'
});

/**
 * Obtiene un usuario de Telegram
 * @param {number} userId - Telegram user_id
 * @returns {Promise<object|null>}
 */
export async function getUser(userId) {
  try {
    const result = await pool.query(
      'SELECT * FROM telegram_users WHERE user_id = $1',
      [userId]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('[Telegram User Queries] Error getting user:', error);
    throw error;
  }
}

/**
 * Crea o actualiza un usuario de Telegram
 * @param {object} userData
 * @param {number} userData.user_id
 * @param {string} userData.username
 * @param {string} userData.first_name
 * @param {string} userData.last_name
 * @param {string} userData.language_code
 * @returns {Promise<object>}
 */
export async function upsertUser(userData) {
  const {
    user_id,
    username,
    first_name,
    last_name,
    language_code = 'es'
  } = userData;

  try {
    const result = await pool.query(
      `INSERT INTO telegram_users (user_id, username, first_name, last_name, language_code)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id)
       DO UPDATE SET
         username = EXCLUDED.username,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         language_code = EXCLUDED.language_code,
         last_interaction_at = NOW()
       RETURNING *`,
      [user_id, username, first_name, last_name, language_code]
    );

    return result.rows[0];
  } catch (error) {
    console.error('[Telegram User Queries] Error upserting user:', error);
    throw error;
  }
}

/**
 * Actualiza el agente activo de un usuario
 * @param {number} userId
 * @param {string} agentId
 * @returns {Promise<object>}
 */
export async function setActiveAgent(userId, agentId) {
  try {
    const result = await pool.query(
      `UPDATE telegram_users
       SET active_agent_id = $1, last_interaction_at = NOW()
       WHERE user_id = $2
       RETURNING *`,
      [agentId, userId]
    );

    if (result.rowCount === 0) {
      throw new Error(`User ${userId} not found`);
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Telegram User Queries] Error setting active agent:', error);
    throw error;
  }
}

/**
 * Obtiene el agente activo de un usuario
 * @param {number} userId
 * @returns {Promise<string|null>}
 */
export async function getActiveAgent(userId) {
  try {
    const user = await getUser(userId);
    return user?.active_agent_id || null;
  } catch (error) {
    console.error('[Telegram User Queries] Error getting active agent:', error);
    throw error;
  }
}

/**
 * Autoriza o desautoriza un usuario
 * @param {number} userId
 * @param {boolean} isAuthorized
 * @param {string} role - 'viewer' | 'operator' | 'admin'
 * @returns {Promise<object>}
 */
export async function setAuthorization(userId, isAuthorized, role = 'viewer') {
  try {
    const result = await pool.query(
      `UPDATE telegram_users
       SET is_authorized = $1, role = $2
       WHERE user_id = $3
       RETURNING *`,
      [isAuthorized, role, userId]
    );

    if (result.rowCount === 0) {
      throw new Error(`User ${userId} not found`);
    }

    return result.rows[0];
  } catch (error) {
    console.error('[Telegram User Queries] Error setting authorization:', error);
    throw error;
  }
}

/**
 * Lista todos los usuarios autorizados
 * @returns {Promise<Array>}
 */
export async function listAuthorizedUsers() {
  try {
    const result = await pool.query(
      `SELECT * FROM telegram_users
       WHERE is_authorized = TRUE
       ORDER BY last_interaction_at DESC`
    );

    return result.rows;
  } catch (error) {
    console.error('[Telegram User Queries] Error listing authorized users:', error);
    throw error;
  }
}

/**
 * Lista usuarios inactivos (más de N días sin interacción)
 * @param {number} days - Días de inactividad (default: 30)
 * @returns {Promise<Array>}
 */
export async function listInactiveUsers(days = 30) {
  try {
    const result = await pool.query(
      `SELECT * FROM telegram_users
       WHERE last_interaction_at < NOW() - INTERVAL '${days} days'
       ORDER BY last_interaction_at DESC`
    );

    return result.rows;
  } catch (error) {
    console.error('[Telegram User Queries] Error listing inactive users:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de usuarios
 * @returns {Promise<object>}
 */
export async function getUserStats() {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE is_authorized = TRUE) as authorized_users,
        COUNT(*) FILTER (WHERE is_authorized = FALSE) as unauthorized_users,
        COUNT(*) FILTER (WHERE role = 'admin') as admins,
        COUNT(*) FILTER (WHERE role = 'operator') as operators,
        COUNT(*) FILTER (WHERE role = 'viewer') as viewers,
        COUNT(*) FILTER (WHERE last_interaction_at > NOW() - INTERVAL '7 days') as active_last_7_days,
        COUNT(*) FILTER (WHERE last_interaction_at > NOW() - INTERVAL '30 days') as active_last_30_days
      FROM telegram_users
    `);

    const agentUsage = await pool.query(`
      SELECT
        active_agent_id,
        COUNT(*) as user_count
      FROM telegram_users
      WHERE active_agent_id IS NOT NULL
      GROUP BY active_agent_id
      ORDER BY user_count DESC
    `);

    return {
      overall: result.rows[0],
      agent_usage: agentUsage.rows
    };
  } catch (error) {
    console.error('[Telegram User Queries] Error getting user stats:', error);
    throw error;
  }
}

/**
 * Actualiza el timestamp de última interacción
 * @param {number} userId
 */
export async function touchUser(userId) {
  try {
    await pool.query(
      `UPDATE telegram_users
       SET last_interaction_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );
  } catch (error) {
    console.error('[Telegram User Queries] Error touching user:', error);
    // No lanzar error, esto es best-effort
  }
}

/**
 * Cierra la conexión del pool
 */
export async function closePool() {
  await pool.end();
}

// CLI para testing
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const command = process.argv[2];

  if (command === 'stats') {
    getUserStats()
      .then(stats => {
        console.log('\n📊 Telegram User Statistics\n');
        console.log('Overall:', stats.overall);
        console.log('\nAgent Usage:', stats.agent_usage);
        process.exit(0);
      })
      .catch(err => {
        console.error('Error:', err);
        process.exit(1);
      });
  } else if (command === 'list') {
    listAuthorizedUsers()
      .then(users => {
        console.log('\n👥 Authorized Users:\n');
        console.table(users.map(u => ({
          user_id: u.user_id,
          username: u.username,
          first_name: u.first_name,
          role: u.role,
          active_agent: u.active_agent_id,
          last_interaction: u.last_interaction_at
        })));
        process.exit(0);
      })
      .catch(err => {
        console.error('Error:', err);
        process.exit(1);
      });
  } else if (command === 'inactive') {
    const days = parseInt(process.argv[3] || '30');
    listInactiveUsers(days)
      .then(users => {
        console.log(`\n😴 Inactive Users (${days}+ days):\n`);
        console.table(users.map(u => ({
          user_id: u.user_id,
          username: u.username,
          last_interaction: u.last_interaction_at
        })));
        process.exit(0);
      })
      .catch(err => {
        console.error('Error:', err);
        process.exit(1);
      });
  } else {
    console.log(`
Usage:
  node telegram_user_queries.js stats              # Ver estadísticas
  node telegram_user_queries.js list               # Listar usuarios autorizados
  node telegram_user_queries.js inactive [days]    # Listar usuarios inactivos
    `);
    process.exit(0);
  }
}
