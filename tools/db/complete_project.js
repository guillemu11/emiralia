/**
 * Emiralia — Complete Project
 *
 * Cierra un proyecto atomicamente:
 *   1. Marca todas las tasks como Done
 *   2. Genera resumen estructurado de completion
 *   3. Actualiza status a Completed + description con resumen
 *   4. Registra en audit_log
 *   5. Actualiza memoria compartida del PM Agent
 *
 * Uso como modulo:
 *   import { completeProject } from './tools/db/complete_project.js';
 *   const result = await completeProject(12, { notes: 'MVP entregado' });
 *
 * Uso CLI:
 *   node tools/db/complete_project.js <projectId> [--notes="..."]
 */

import pool from './pool.js';
import { setMemory } from './memory.js';
import { trackSkill } from '../workspace-skills/skill-tracker.js';
import { recordActivity } from '../workspace-skills/activity-harvester.js';

/**
 * Completa un proyecto con transaccion atomica.
 * @param {number} projectId
 * @param {Object} [opts]
 * @param {string} [opts.notes] - Notas manuales de completion
 * @param {string} [opts.agentId] - Agente que cierra (default: pm-agent)
 * @returns {{ success, summary, auditLogId, alreadyCompleted }}
 */
export async function completeProject(projectId, { notes, agentId = 'pm-agent' } = {}) {
    const startTime = Date.now();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Fetch project
        const projRes = await client.query('SELECT * FROM projects WHERE id = $1', [projectId]);
        if (!projRes.rows[0]) {
            await client.query('ROLLBACK');
            return { success: false, error: `Proyecto #${projectId} no encontrado` };
        }

        const project = projRes.rows[0];

        // 2. Check if already completed
        if (project.status === 'Completed') {
            await client.query('ROLLBACK');
            return {
                success: true,
                alreadyCompleted: true,
                summary: null,
                message: `Proyecto #${projectId} ya fue completado el ${project.updated_at?.toISOString()?.split('T')[0] || 'fecha desconocida'}`
            };
        }

        // 3. Fetch phases + tasks
        const phasesRes = await client.query(
            'SELECT * FROM phases WHERE project_id = $1 ORDER BY phase_number',
            [projectId]
        );
        const phases = phasesRes.rows;

        const tasksRes = await client.query(
            `SELECT t.*, p.name as phase_name, p.phase_number
             FROM tasks t
             JOIN phases p ON t.phase_id = p.id
             WHERE p.project_id = $1
             ORDER BY p.phase_number, t.id`,
            [projectId]
        );
        const tasks = tasksRes.rows;

        // 4. Count task statuses before marking done
        const tasksBefore = {
            total: tasks.length,
            done: tasks.filter(t => t.status === 'Done').length,
            inProgress: tasks.filter(t => t.status === 'In Progress').length,
            todo: tasks.filter(t => t.status === 'Todo').length,
        };

        // 5. Mark all tasks as Done
        if (tasks.length > 0) {
            await client.query(
                `UPDATE tasks SET status = 'Done', updated_at = NOW()
                 WHERE phase_id IN (SELECT id FROM phases WHERE project_id = $1)
                   AND status != 'Done'`,
                [projectId]
            );
        }

        // 6. Build completion summary
        const summary = buildCompletionSummary(project, phases, tasks, tasksBefore, notes);
        const summaryMd = formatSummaryMarkdown(summary);

        // 7. Update project status + description
        await client.query(
            `UPDATE projects SET status = 'Completed', description = $1, updated_at = NOW()
             WHERE id = $2`,
            [summaryMd, projectId]
        );

        // 8. Audit log
        const auditRes = await client.query(
            `INSERT INTO audit_log (event_type, department, agent_id, title, details)
             VALUES ('project_completion', $1, $2, $3, $4)
             RETURNING id`,
            [
                project.department || 'General',
                agentId,
                `Proyecto "${project.name}" completado`,
                JSON.stringify(summary),
            ]
        );

        await client.query('COMMIT');

        // 9. Post-commit: memory + tracking (non-blocking)
        try {
            await setMemory(agentId, 'last_project_closed', {
                projectId,
                projectName: project.name,
                completedAt: new Date().toISOString(),
                totalTasks: tasksBefore.total,
                department: project.department,
            }, 'shared');
        } catch { /* non-blocking */ }

        const durationMs = Date.now() - startTime;
        trackSkill(agentId, 'cerrar-proyecto', 'ejecucion', 'completed', durationMs, String(projectId), 'user').catch(() => {});
        recordActivity(agentId, 'project_completion', {
            projectId,
            projectName: project.name,
            tasksClosed: tasksBefore.total,
            durationMs,
            status: 'success',
        }).catch(() => {});

        return {
            success: true,
            summary,
            summaryMd,
            auditLogId: auditRes.rows[0].id,
        };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

// ─── Summary Builder ────────────────────────────────────────────────────────

function buildCompletionSummary(project, phases, tasks, tasksBefore, notes) {
    const agents = [...new Set(tasks.map(t => t.agent).filter(Boolean))];
    const phasesSummary = phases.map(p => {
        const phaseTasks = tasks.filter(t => t.phase_name === p.name);
        return {
            number: p.phase_number,
            name: p.name,
            objective: p.objective,
            taskCount: phaseTasks.length,
            agents: [...new Set(phaseTasks.map(t => t.agent).filter(Boolean))],
        };
    });

    return {
        projectId: project.id,
        projectName: project.name,
        department: project.department || 'General',
        problem: project.problem,
        solution: project.solution,
        createdAt: project.created_at?.toISOString(),
        completedAt: new Date().toISOString(),
        phases: {
            total: phases.length,
            detail: phasesSummary,
        },
        tasks: {
            total: tasksBefore.total,
            previouslyDone: tasksBefore.done,
            closedNow: tasksBefore.inProgress + tasksBefore.todo,
        },
        agentsInvolved: agents,
        notes: notes || null,
    };
}

function formatSummaryMarkdown(summary) {
    const lines = [];
    lines.push(`## Resultado Final`);
    lines.push('');

    if (summary.problem) {
        lines.push(`### Problema resuelto`);
        lines.push(summary.problem);
        lines.push('');
    }

    if (summary.solution) {
        lines.push(`### Solucion implementada`);
        lines.push(summary.solution);
        lines.push('');
    }

    lines.push(`### Metricas de cierre`);
    lines.push(`- Fases: ${summary.phases.total}`);
    lines.push(`- Tasks: ${summary.tasks.total} (${summary.tasks.previouslyDone} ya completadas, ${summary.tasks.closedNow} cerradas al completar)`);
    lines.push(`- Agentes involucrados: ${summary.agentsInvolved.join(', ') || 'N/A'}`);
    lines.push(`- Creado: ${summary.createdAt?.split('T')[0] || 'N/A'}`);
    lines.push(`- Completado: ${summary.completedAt?.split('T')[0]}`);
    lines.push('');

    if (summary.phases.detail.length > 0) {
        lines.push(`### Fases`);
        for (const p of summary.phases.detail) {
            lines.push(`**Phase ${p.number}: ${p.name}** — ${p.taskCount} tasks`);
            if (p.objective) lines.push(`  ${p.objective}`);
        }
        lines.push('');
    }

    if (summary.notes) {
        lines.push(`### Notas de cierre`);
        lines.push(summary.notes);
        lines.push('');
    }

    return lines.join('\n');
}

// ─── CLI ────────────────────────────────────────────────────────────────────

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('complete_project.js');

if (isDirectRun) {
    const args = process.argv.slice(2);
    const projectId = parseInt(args.find(a => !a.startsWith('--')), 10);
    const notesArg = args.find(a => a.startsWith('--notes='));
    const notes = notesArg ? notesArg.split('=').slice(1).join('=').replace(/^"|"$/g, '') : undefined;

    if (!projectId || isNaN(projectId)) {
        console.error('Uso: node tools/db/complete_project.js <projectId> [--notes="..."]');
        console.error('Ejemplo: node tools/db/complete_project.js 12 --notes="MVP entregado"');
        process.exit(1);
    }

    try {
        const result = await completeProject(projectId, { notes });

        if (!result.success) {
            console.error(`Error: ${result.error}`);
            process.exit(1);
        }

        if (result.alreadyCompleted) {
            console.log(result.message);
        } else {
            console.log(`\n✅ Proyecto #${projectId} completado`);
            console.log(`   Audit log ID: ${result.auditLogId}`);
            console.log(`\n${result.summaryMd}`);
        }
    } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    } finally {
        await pool.end();
    }
}
