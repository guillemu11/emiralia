/**
 * Emiralia — Guardar Proyecto
 *
 * Persiste el breakdown estructurado del PM Agent en PostgreSQL.
 */

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5433', 10),
    database: process.env.PG_DB || 'emiralia',
    user: process.env.PG_USER || 'emiralia',
    password: process.env.PG_PASSWORD || 'changeme',
    ssl: process.env.PG_SSL === 'false' ? false : { rejectUnauthorized: false }
});

/**
 * Reset all SERIAL sequences to MAX(id)+1 to prevent duplicate key errors.
 * Safe to call multiple times — idempotent.
 */
async function fixSequences(client) {
    for (const table of ['projects', 'phases', 'tasks']) {
        await client.query(`
            SELECT setval(pg_get_serial_sequence('${table}', 'id'),
                COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1,
                false
            )
        `);
    }
}

/**
 * Guarda un proyecto completo con sus fases y tareas.
 * @param {Object} data - JSON estructurado del PM Agent
 * @returns {number} ID del proyecto creado
 */
export async function saveProject(data, _retry = false) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await fixSequences(client);

        // 1. Insertar Proyecto
        const projectRes = await client.query(
            `INSERT INTO projects (name, problem, solution, success_metrics, blocks, department, sub_area, pain_points, requirements, risks, estimated_budget, estimated_timeline, future_improvements, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id`,
            [
                data.project_name,
                data.problem,
                data.solution,
                JSON.stringify(data.success_metrics || []),
                JSON.stringify(data.blocks || []),
                data.department || 'General',
                data.sub_area || 'General',
                JSON.stringify(data.pain_points || []),
                JSON.stringify(data.requirements || []),
                JSON.stringify(data.risks || []),
                data.estimated_budget || 0,
                data.estimated_timeline || 'TBD',
                JSON.stringify(data.future_improvements || []),
                'Planning'
            ]
        );
        const projectId = projectRes.rows[0].id;

        // 2. Insertar Fases y Tareas
        if (data.phases && Array.isArray(data.phases)) {
            for (const phase of data.phases) {
                const phaseRes = await client.query(
                    `INSERT INTO phases (project_id, phase_number, name, objective)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
                    [projectId, phase.phase_number, phase.phase_name, phase.objective]
                );
                const phaseId = phaseRes.rows[0].id;

                if (phase.functionalities && Array.isArray(phase.functionalities)) {
                    for (const func of phase.functionalities) {
                        if (func.tasks && Array.isArray(func.tasks)) {
                            for (const task of func.tasks) {
                                await client.query(
                                    `INSERT INTO tasks (phase_id, description, agent, effort, status, dependencies, type, priority)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                                    [
                                        phaseId,
                                        `[${func.name}] ${task.description}`,
                                        task.agent,
                                        task.effort,
                                        'Todo',
                                        JSON.stringify(task.dependencies || []),
                                        task.type || 'Task',
                                        task.priority || 'Medium'
                                    ]
                                );
                            }
                        }
                    }
                }
            }
        }

        await client.query('COMMIT');
        return projectId;
    } catch (err) {
        await client.query('ROLLBACK');
        // Retry once on duplicate key — sequence was stale despite fixSequences
        if (!_retry && err.code === '23505') {
            client.release();
            return saveProject(data, true);
        }
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Actualiza un proyecto existente (sobrescribe fases y tareas).
 */
export async function updateProject(projectId, data) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Actualizar Proyecto base
        await client.query(
            `UPDATE projects 
       SET name = $1, problem = $2, solution = $3, success_metrics = $4, blocks = $5, department = $6, sub_area = $7, 
           pain_points = $8, requirements = $9, risks = $10, estimated_budget = $11, estimated_timeline = $12, 
           future_improvements = $13, updated_at = NOW()
       WHERE id = $14`,
            [
                data.project_name,
                data.problem,
                data.solution,
                JSON.stringify(data.success_metrics || []),
                JSON.stringify(data.blocks || []),
                data.department || 'General',
                data.sub_area || 'General',
                JSON.stringify(data.pain_points || []),
                JSON.stringify(data.requirements || []),
                JSON.stringify(data.risks || []),
                data.estimated_budget || 0,
                data.estimated_timeline || 'TBD',
                JSON.stringify(data.future_improvements || []),
                projectId
            ]
        );

        // 2. Limpiar fases y tareas antiguas para re-insertar
        // (En un sistema real querríamos ser más granulares, pero para el prototipo 
        // de PM Agent, el bot genera el breakdown entero de nuevo).
        await client.query('DELETE FROM phases WHERE project_id = $1', [projectId]);
        await fixSequences(client);

        // 3. Re-insertar Fases y Tareas
        if (data.phases && Array.isArray(data.phases)) {
            for (const phase of data.phases) {
                const phaseRes = await client.query(
                    `INSERT INTO phases (project_id, phase_number, name, objective)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
                    [projectId, phase.phase_number, phase.phase_name, phase.objective]
                );
                const phaseId = phaseRes.rows[0].id;

                if (phase.functionalities && Array.isArray(phase.functionalities)) {
                    for (const func of phase.functionalities) {
                        if (func.tasks && Array.isArray(func.tasks)) {
                            for (const task of func.tasks) {
                                await client.query(
                                    `INSERT INTO tasks (phase_id, description, agent, effort, status, dependencies, type, priority)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                                    [
                                        phaseId,
                                        `[${func.name}] ${task.description}`,
                                        task.agent,
                                        task.effort,
                                        'Todo',
                                        JSON.stringify(task.dependencies || []),
                                        task.type || 'Task',
                                        task.priority || 'Medium'
                                    ]
                                );
                            }
                        }
                    }
                }
            }
        }

        await client.query('COMMIT');
        return projectId;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Inyecta una tarea rápida en un proyecto existente.
 * La inserta en la última fase del proyecto.
 * @param {number} projectId - ID del proyecto
 * @param {Object} taskData - { description, agent, effort, type, priority, justification }
 * @returns {Object} Tarea creada
 */
export async function addTaskToProject(projectId, taskData) {
    const client = await pool.connect();
    try {
        await fixSequences(client);

        // Buscar la última fase del proyecto
        const phaseRes = await client.query(
            'SELECT id FROM phases WHERE project_id = $1 ORDER BY phase_number DESC LIMIT 1',
            [projectId]
        );

        let phaseId;
        if (phaseRes.rows.length === 0) {
            // Si no hay fases, crear una fase "Backlog"
            const newPhase = await client.query(
                `INSERT INTO phases (project_id, phase_number, name, objective)
                 VALUES ($1, 0, 'Backlog', 'Tareas inyectadas vía /task') RETURNING id`,
                [projectId]
            );
            phaseId = newPhase.rows[0].id;
        } else {
            phaseId = phaseRes.rows[0].id;
        }

        const result = await client.query(
            `INSERT INTO tasks (phase_id, description, agent, effort, status, type, priority, dependencies)
             VALUES ($1, $2, $3, $4, 'Todo', $5, $6, '[]') RETURNING *`,
            [
                phaseId,
                taskData.description,
                taskData.agent || 'dev-agent',
                taskData.effort || 'M',
                taskData.type || 'Task',
                taskData.priority || 'Medium',
            ]
        );
        return result.rows[0];
    } finally {
        client.release();
    }
}

// Para cerrar el pool si se usa como script
export async function closePool() {
    await pool.end();
}
