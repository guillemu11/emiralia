/**
 * Emiralia — Save / Update Artifact
 *
 * Tool para que los agentes persistan contenido generado en la tabla artifacts.
 *
 * Usage (CLI):
 *   node tools/db/save_artifact.js create <agent_id> <type> <title> <content> [metadata_json]
 *   node tools/db/save_artifact.js update <artifact_id> <title> <content> [metadata_json]
 *   node tools/db/save_artifact.js status <artifact_id> <status> [rejection_reason]
 *   node tools/db/save_artifact.js get <artifact_id>
 */

import pool from './pool.js';

/**
 * Crea un nuevo artefacto en estado 'draft'.
 */
export async function saveArtifact({ agent_id, type, title, content = '', metadata = {} }) {
    const result = await pool.query(
        `INSERT INTO artifacts (agent_id, type, title, content, metadata, status)
         VALUES ($1, $2, $3, $4, $5, 'draft')
         RETURNING *`,
        [agent_id, type, title, content, JSON.stringify(metadata)]
    );
    return result.rows[0];
}

/**
 * Actualiza título, contenido y/o metadata de un artefacto existente.
 */
export async function updateArtifact(id, { title, content, metadata } = {}) {
    const sets = [];
    const params = [];

    if (title !== undefined)    { params.push(title);                  sets.push(`title = $${params.length}`); }
    if (content !== undefined)  { params.push(content);                sets.push(`content = $${params.length}`); }
    if (metadata !== undefined) { params.push(JSON.stringify(metadata)); sets.push(`metadata = $${params.length}`); }

    if (sets.length === 0) throw new Error('updateArtifact: no fields to update');

    sets.push('updated_at = NOW()');
    params.push(id);

    const result = await pool.query(
        `UPDATE artifacts SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
        params
    );
    return result.rows[0];
}

/**
 * Cambia el status de un artefacto (draft → pending_review → approved/rejected → published).
 */
export async function setArtifactStatus(id, status, rejectionReason = null) {
    const validStatuses = ['draft', 'pending_review', 'approved', 'rejected', 'published'];
    if (!validStatuses.includes(status)) {
        throw new Error(`Status inválido: ${status}. Valores válidos: ${validStatuses.join(', ')}`);
    }

    const result = await pool.query(
        `UPDATE artifacts
         SET status = $1, rejection_reason = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [status, rejectionReason, id]
    );
    if (!result.rows[0]) throw new Error(`Artefacto ${id} no encontrado`);
    return result.rows[0];
}

/**
 * Obtiene un artefacto por ID.
 */
export async function getArtifact(id) {
    const result = await pool.query('SELECT * FROM artifacts WHERE id = $1', [id]);
    return result.rows[0] || null;
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

if (process.argv[1] && process.argv[1].endsWith('save_artifact.js')) {
    const [, , cmd, ...args] = process.argv;

    try {
        switch (cmd) {
            case 'create': {
                const [agent_id, type, title, content, metadata_json] = args;
                if (!agent_id || !type || !title) {
                    console.error('Usage: save_artifact.js create <agent_id> <type> <title> <content> [metadata_json]');
                    process.exit(1);
                }
                const metadata = metadata_json ? JSON.parse(metadata_json) : {};
                const artifact = await saveArtifact({ agent_id, type, title, content: content || '', metadata });
                console.log(JSON.stringify(artifact, null, 2));
                break;
            }
            case 'update': {
                const [id, title, content, metadata_json] = args;
                if (!id) { console.error('Usage: save_artifact.js update <artifact_id> <title> <content> [metadata_json]'); process.exit(1); }
                const metadata = metadata_json ? JSON.parse(metadata_json) : undefined;
                const artifact = await updateArtifact(id, { title, content, metadata });
                console.log(JSON.stringify(artifact, null, 2));
                break;
            }
            case 'status': {
                const [id, status, rejection_reason] = args;
                if (!id || !status) { console.error('Usage: save_artifact.js status <artifact_id> <status> [rejection_reason]'); process.exit(1); }
                const artifact = await setArtifactStatus(id, status, rejection_reason || null);
                console.log(JSON.stringify(artifact, null, 2));
                break;
            }
            case 'get': {
                const [id] = args;
                if (!id) { console.error('Usage: save_artifact.js get <artifact_id>'); process.exit(1); }
                const artifact = await getArtifact(id);
                console.log(JSON.stringify(artifact, null, 2));
                break;
            }
            default:
                console.error('Comandos disponibles: create | update | status | get');
                process.exit(1);
        }
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}
