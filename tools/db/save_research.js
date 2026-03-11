/**
 * Emiralia — Guardar Investigación Estratégica
 *
 * Persiste documentos de research (market sizing, GTM, competidores, PRDs)
 * en la tabla pm_reports de PostgreSQL.
 *
 * Uso como módulo:
 *   import { saveResearch } from './tools/db/save_research.js';
 *   const id = await saveResearch({ title, summary, body_md, metrics, risks, next_steps });
 *
 * Uso como CLI:
 *   node tools/db/save_research.js --title "Análisis X" --summary "Resumen" --body "# Contenido MD"
 */

import pool from './pool.js';

/**
 * @param {Object} data
 * @param {string} data.title - Título del documento
 * @param {string} [data.summary] - Resumen ejecutivo
 * @param {string} [data.body_md] - Contenido completo en Markdown
 * @param {Object} [data.metrics] - Métricas estructuradas (JSONB)
 * @param {Array}  [data.risks] - Lista de riesgos identificados
 * @param {Array}  [data.next_steps] - Próximos pasos recomendados
 * @returns {number} ID del registro creado
 */
export async function saveResearch(data) {
  const result = await pool.query(
    `INSERT INTO pm_reports (title, summary, body_md, metrics, risks, next_steps)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      data.title,
      data.summary || null,
      data.body_md || null,
      JSON.stringify(data.metrics || {}),
      JSON.stringify(data.risks || []),
      JSON.stringify(data.next_steps || []),
    ]
  );
  return result.rows[0].id;
}

// CLI mode
const args = process.argv.slice(2);
if (args.includes('--title')) {
  const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
  };

  const title = getArg('--title');
  if (!title) {
    console.error('Error: --title es obligatorio');
    process.exit(1);
  }

  saveResearch({
    title,
    summary: getArg('--summary'),
    body_md: getArg('--body'),
  })
    .then((id) => {
      console.log(`Research guardado con id=${id}`);
      return pool.end();
    })
    .catch((err) => {
      console.error('Error:', err.message);
      pool.end();
      process.exit(1);
    });
}
