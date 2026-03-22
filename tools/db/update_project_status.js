/**
 * Emiralia — Actualizar Estado de Proyecto
 *
 * Cambia el status de un proyecto en PostgreSQL.
 *
 * Uso:
 *   node tools/db/update_project_status.js <project_id> <status>
 *
 * Status válidos: Planning | In Progress | Completed | Paused
 *
 * Ejemplos:
 *   node tools/db/update_project_status.js 5 "In Progress"
 *   node tools/db/update_project_status.js 5 Completed
 */

import pool from './pool.js';

const VALID_STATUSES = ['Planning', 'In Progress', 'Completed', 'Paused'];

async function updateProjectStatus(projectId, status) {
    if (!VALID_STATUSES.includes(status)) {
        throw new Error(`Status inválido: "${status}". Válidos: ${VALID_STATUSES.join(', ')}`);
    }

    const result = await pool.query(
        `UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, status`,
        [status, projectId]
    );

    if (result.rowCount === 0) {
        throw new Error(`Proyecto #${projectId} no encontrado`);
    }

    return result.rows[0];
}

// CLI
const [,, projectId, status] = process.argv;

if (!projectId || !status) {
    console.error('Uso: node tools/db/update_project_status.js <project_id> <status>');
    console.error(`Status válidos: ${VALID_STATUSES.join(', ')}`);
    process.exit(1);
}

updateProjectStatus(parseInt(projectId, 10), status)
    .then(project => {
        console.log(`✅ Proyecto #${project.id} "${project.name}" → ${project.status}`);
        process.exit(0);
    })
    .catch(err => {
        console.error(`❌ ${err.message}`);
        process.exit(1);
    })
    .finally(() => pool.end());
