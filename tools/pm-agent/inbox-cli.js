/**
 * Emiralia — PM Agent Inbox CLI
 *
 * Persiste el ciclo de vida del PM Agent (chat -> borrador -> proyecto)
 * desde Claude Code al mismo sistema de inbox del Dashboard y Telegram.
 *
 * Uso CLI:
 *   node tools/pm-agent/inbox-cli.js create <titulo>
 *   node tools/pm-agent/inbox-cli.js append <id> <role> <mensaje>
 *   node tools/pm-agent/inbox-cli.js get <id>
 *   echo "resumen" | node tools/pm-agent/inbox-cli.js to-borrador <id>
 *   echo '{"project_name":...}' | node tools/pm-agent/inbox-cli.js to-proyecto <id>
 *   node tools/pm-agent/inbox-cli.js list
 */

import pool from '../db/pool.js';
import { saveProject } from '../db/save_project.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function readStdin() {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    return Buffer.concat(chunks).toString('utf-8').trim();
}

// ─── Subcommands ────────────────────────────────────────────────────────────

async function create(title) {
    if (!title) {
        console.error('Uso: node tools/pm-agent/inbox-cli.js create <titulo>');
        process.exit(1);
    }
    const result = await pool.query(
        `INSERT INTO inbox_items (title, source, source_user, status, conversation)
         VALUES ($1, 'claude-code', 'claude-code', 'chat', '[]'::jsonb)
         RETURNING id, title, status, created_at`,
        [title]
    );
    console.log(JSON.stringify(result.rows[0]));
}

async function append(id, role, message) {
    if (!id || !role || !message) {
        console.error('Uso: node tools/pm-agent/inbox-cli.js append <id> <role> <mensaje>');
        process.exit(1);
    }
    if (!['user', 'assistant'].includes(role)) {
        console.error('Role debe ser "user" o "assistant"');
        process.exit(1);
    }

    const item = await pool.query('SELECT conversation FROM inbox_items WHERE id = $1', [id]);
    if (item.rows.length === 0) {
        console.error(`Inbox item #${id} no encontrado`);
        process.exit(1);
    }

    const conversation = item.rows[0].conversation || [];
    conversation.push({ role, content: message });

    await pool.query(
        'UPDATE inbox_items SET conversation = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(conversation), id]
    );
    console.log(JSON.stringify({ id: parseInt(id), messages: conversation.length }));
}

async function get(id) {
    if (!id) {
        console.error('Uso: node tools/pm-agent/inbox-cli.js get <id>');
        process.exit(1);
    }
    const result = await pool.query('SELECT * FROM inbox_items WHERE id = $1', [id]);
    if (result.rows.length === 0) {
        console.error(`Inbox item #${id} no encontrado`);
        process.exit(1);
    }
    console.log(JSON.stringify(result.rows[0], null, 2));
}

async function toBorrador(id) {
    if (!id) {
        console.error('Uso: echo "resumen" | node tools/pm-agent/inbox-cli.js to-borrador <id>');
        process.exit(1);
    }

    const summary = await readStdin();
    if (!summary) {
        console.error('No se recibio summary por stdin');
        process.exit(1);
    }

    const item = await pool.query('SELECT status FROM inbox_items WHERE id = $1', [id]);
    if (item.rows.length === 0) {
        console.error(`Inbox item #${id} no encontrado`);
        process.exit(1);
    }
    if (item.rows[0].status !== 'chat') {
        console.error(`No se puede crear borrador desde status '${item.rows[0].status}'`);
        process.exit(1);
    }

    await pool.query(
        `UPDATE inbox_items
         SET summary = $1, conversation = '[]'::jsonb, status = 'borrador', updated_at = NOW()
         WHERE id = $2`,
        [summary, id]
    );
    console.log(JSON.stringify({ id: parseInt(id), status: 'borrador' }));
}

async function toProyecto(id) {
    if (!id) {
        console.error('Uso: echo \'{"project_name":...}\' | node tools/pm-agent/inbox-cli.js to-proyecto <id>');
        process.exit(1);
    }

    const raw = await readStdin();
    if (!raw) {
        console.error('No se recibio JSON por stdin');
        process.exit(1);
    }

    let projectData;
    try {
        projectData = JSON.parse(raw);
    } catch {
        console.error('JSON invalido recibido por stdin');
        process.exit(1);
    }

    if (!projectData.project_name) {
        console.error('El JSON debe contener "project_name"');
        process.exit(1);
    }

    const item = await pool.query('SELECT status FROM inbox_items WHERE id = $1', [id]);
    if (item.rows.length === 0) {
        console.error(`Inbox item #${id} no encontrado`);
        process.exit(1);
    }
    if (item.rows[0].status !== 'borrador') {
        console.error(`No se puede crear proyecto desde status '${item.rows[0].status}'`);
        process.exit(1);
    }

    const projectId = await saveProject(projectData);

    await pool.query(
        `UPDATE inbox_items
         SET structured_data = $1, project_id = $2, status = 'proyecto', updated_at = NOW()
         WHERE id = $3`,
        [JSON.stringify(projectData), projectId, id]
    );
    console.log(JSON.stringify({ id: parseInt(id), status: 'proyecto', project_id: projectId }));
}

async function list() {
    const result = await pool.query(
        `SELECT id, title, status, source, created_at, updated_at
         FROM inbox_items
         WHERE source = 'claude-code'
         ORDER BY created_at DESC
         LIMIT 10`
    );
    console.log(JSON.stringify(result.rows, null, 2));
}

// ─── CLI Router ─────────────────────────────────────────────────────────────

const [,, cmd, ...args] = process.argv;

if (!cmd) {
    console.error('Uso: node tools/pm-agent/inbox-cli.js <create|append|get|to-borrador|to-proyecto|list> [args...]');
    process.exit(1);
}

try {
    switch (cmd) {
        case 'create':
            await create(args.join(' '));
            break;
        case 'append':
            await append(args[0], args[1], args.slice(2).join(' '));
            break;
        case 'get':
            await get(args[0]);
            break;
        case 'to-borrador':
            await toBorrador(args[0]);
            break;
        case 'to-proyecto':
            await toProyecto(args[0]);
            break;
        case 'list':
            await list();
            break;
        default:
            console.error(`Comando desconocido: ${cmd}. Usa create | append | get | to-borrador | to-proyecto | list`);
            process.exit(1);
    }
} catch (err) {
    console.error(`[inbox-cli] Error: ${err.message}`);
    process.exit(1);
} finally {
    await pool.end();
}
