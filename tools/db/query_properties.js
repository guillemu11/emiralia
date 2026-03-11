/**
 * Emiralia — Query Properties (Read-Only)
 *
 * Helper seguro para ejecutar consultas SELECT sobre la base de datos.
 * Rechaza cualquier query que no sea SELECT puro.
 *
 * Uso como módulo:
 *   import { queryDB } from './tools/db/query_properties.js';
 *   const rows = await queryDB('SELECT community, COUNT(*) FROM properties GROUP BY community');
 *
 * Uso como CLI:
 *   node tools/db/query_properties.js "SELECT community, COUNT(*) FROM properties GROUP BY community"
 */

import pool from './pool.js';
import { trackSkill } from '../workspace-skills/skill-tracker.js';

const FORBIDDEN_KEYWORDS = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|COPY)\b/i;

/**
 * Ejecuta una query SELECT de solo lectura.
 * @param {string} sql - Consulta SQL (solo SELECT)
 * @param {Array} [params] - Parámetros opcionales ($1, $2...)
 * @returns {Array} Filas resultantes
 */
export async function queryDB(sql, params = []) {
  trackSkill('data-agent', 'query-properties', 'data', 'completed').catch(() => {});
  const trimmed = sql.trim();

  if (FORBIDDEN_KEYWORDS.test(trimmed)) {
    throw new Error('Solo se permiten consultas SELECT. Query rechazada por seguridad.');
  }

  if (!/^SELECT\b/i.test(trimmed) && !/^WITH\b/i.test(trimmed)) {
    throw new Error('La query debe comenzar con SELECT o WITH (CTE).');
  }

  const result = await pool.query(trimmed, params);
  return result.rows;
}

// CLI mode
const query = process.argv[2];
if (query) {
  queryDB(query)
    .then((rows) => {
      console.log(JSON.stringify(rows, null, 2));
      return pool.end();
    })
    .catch((err) => {
      console.error('Error:', err.message);
      pool.end();
      process.exit(1);
    });
}
