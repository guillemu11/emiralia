/**
 * Emiralia — PM Agent Bot (Telegram)
 *
 * Bot conversacional con UX optimizada para móvil:
 * - Streaming simulado (editMessageText progresivo)
 * - Inline keyboards para acciones (borrador, proyecto, cancelar)
 * - Chunking de mensajes largos
 * - Lifecycle completo: chat → borrador → proyecto (sync con Dashboard)
 *
 * Uso:
 *   node tools/telegram/bot.js
 *
 * Variables de entorno requeridas:
 *   TELEGRAM_BOT_TOKEN, ANTHROPIC_API_KEY,
 *   OPENAI_API_KEY (solo para transcripción de voz Whisper)
 */

import 'dotenv/config';
import { Telegraf, session, Markup } from 'telegraf';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { saveProject, updateProject, addTaskToProject } from '../db/save_project.js';
import { PM_SYSTEM_PROMPT, chatWithPMAgent, extractJSON, generateSummary, generateProject } from '../pm-agent/core.js';
import { buildLightContext } from '../pm-agent/context-builder.js';
import { TELEGRAM_PROMPT_WRAPPER } from './telegram-prompt.js';
import { getSkillRanking } from '../db/query_skill_usage.js';
import { formatSkillRanking } from './skill-ranking-prompt.js';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5433', 10),
    database: process.env.PG_DB || 'emiralia',
    user: process.env.PG_USER || 'emiralia',
    password: process.env.PG_PASSWORD || 'changeme',
});

// ─── Clientes ────────────────────────────────────────────────────────────────

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Gestión de sesiones ─────────────────────────────────────────────────────

bot.use(session({
    defaultSession: () => ({
        messages: [],
        phase: null,  // 'reviewing' | 'proposed' | 'borrador' | 'done' | 'task_proposal'
        questionCount: 0,
        editingProjectId: null,
        currentProjectData: null,
        inboxItemId: null,
    }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Split text into Telegram-friendly chunks respecting paragraph boundaries.
 */
function chunkText(text, maxLength = 900) {
    if (text.length <= maxLength) return [text];

    const chunks = [];
    const paragraphs = text.split(/\n\n+/);
    let current = '';

    for (const para of paragraphs) {
        if ((current + '\n\n' + para).length > maxLength && current) {
            chunks.push(current.trim());
            if (para.length > maxLength) {
                // Hard-split oversized paragraphs by words
                const words = para.split(' ');
                current = '';
                for (const word of words) {
                    if ((current + ' ' + word).length > maxLength) {
                        chunks.push(current.trim());
                        current = word;
                    } else {
                        current = current ? current + ' ' + word : word;
                    }
                }
            } else {
                current = para;
            }
        } else {
            current = current ? current + '\n\n' + para : para;
        }
    }
    if (current) chunks.push(current.trim());

    return chunks.filter(c => c.length > 0);
}

/**
 * Send chunked reply, attaching extra options (like keyboard) only to the last chunk.
 */
async function replyChunked(ctx, text, extra = {}) {
    const chunks = chunkText(text);
    const sent = [];

    for (let i = 0; i < chunks.length; i++) {
        const isLast = i === chunks.length - 1;
        try {
            const msg = await ctx.reply(chunks[i], {
                parse_mode: 'Markdown',
                ...(isLast ? extra : {}),
            });
            sent.push(msg);
        } catch {
            // Retry without Markdown if parse fails
            const msg = await ctx.reply(chunks[i], isLast ? extra : {});
            sent.push(msg);
        }
    }

    return sent;
}

/**
 * Safely try to delete a message (ignore errors).
 */
async function safeDelete(ctx, msgId) {
    try { await ctx.telegram.deleteMessage(ctx.chat.id, msgId); } catch { /* ignore */ }
}

/**
 * Chat with PM Agent using streaming simulation + Telegram-optimized prompt.
 */
async function chat(ctx, userText) {
    ctx.session.messages.push({ role: 'user', content: userText });

    const thinkingMsg = await ctx.reply('...');
    const chatId = ctx.chat.id;
    const msgId = thinkingMsg.message_id;

    try {
        const projectContext = await buildLightContext(pool);
        const telegramSystemPrompt = TELEGRAM_PROMPT_WRAPPER + '\n\n' + PM_SYSTEM_PROMPT;

        const stream = await chatWithPMAgent(ctx.session.messages, {
            editingProjectId: ctx.session.editingProjectId,
            currentProjectData: ctx.session.currentProjectData,
            projectContext,
            stream: true,
            maxTokens: 1024,
            systemPromptOverride: telegramSystemPrompt,
        });

        let accumulated = '';
        let lastEditAt = 0;
        const EDIT_INTERVAL_MS = 1500;

        stream.on('text', (chunk) => {
            accumulated += chunk;
            const now = Date.now();
            if (now - lastEditAt > EDIT_INTERVAL_MS && accumulated.length > 30) {
                lastEditAt = now;
                ctx.telegram.editMessageText(
                    chatId, msgId, undefined,
                    accumulated.substring(0, 4000) + ' ...',
                ).catch(() => { /* ignore rate limit or unchanged text errors */ });
            }
        });

        await stream.finalMessage();
        const reply = accumulated;

        ctx.session.messages.push({ role: 'assistant', content: reply });

        // Detect if reply contains a proposal
        const isProposal = /propuesta|confirmamos|crear.el.borrador|listo para crear/i.test(reply);

        // Delete the streaming message and send final chunks
        await safeDelete(ctx, msgId);

        const keyboard = isProposal
            ? Markup.inlineKeyboard([
                [
                    Markup.button.callback('📝 Crear borrador', 'action_borrador'),
                    Markup.button.callback('🔄 Refinar', 'action_refine'),
                ],
                [Markup.button.callback('❌ Cancelar', 'action_cancel')],
            ])
            : {};

        await replyChunked(ctx, reply, isProposal ? keyboard : {});

        if (isProposal) {
            ctx.session.phase = 'proposed';
        }

        return reply;
    } catch (err) {
        await safeDelete(ctx, msgId);
        await ctx.reply(`Error: ${err.message}`);
        throw err;
    }
}

/**
 * Transcribe voice messages via OpenAI Whisper.
 */
async function transcribeAudio(fileId, ctx) {
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const response = await fetch(fileLink.href);
    const buffer = Buffer.from(await response.arrayBuffer());

    const file = new globalThis.File([buffer], 'audio.ogg', { type: 'audio/ogg' });

    const transcription = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: 'es',
    });

    return transcription.text;
}

// ─── Lifecycle handlers (shared by inline buttons and /ok fallback) ─────────

async function handleCreateBorrador(ctx) {
    if (!ctx.session.phase || ctx.session.messages.length < 2) {
        return ctx.reply('No hay una propuesta activa.');
    }

    const banner = await ctx.reply('📝 _Generando borrador..._', { parse_mode: 'Markdown' });

    try {
        // Step 1: Generate summary via Anthropic API
        let summary;
        try {
            summary = await generateSummary(ctx.session.messages);
        } catch (apiErr) {
            await safeDelete(ctx, banner.message_id);
            console.error('[Bot] generateSummary error:', apiErr);
            return ctx.reply(`Error al generar resumen: ${apiErr.message}`);
        }

        // Step 2: Persist to inbox_items
        let inboxItemId = ctx.session.inboxItemId;
        try {
            const firstUserMsg = ctx.session.messages.find(m => m.role === 'user')?.content || '';
            if (!inboxItemId) {
                const result = await pool.query(
                    `INSERT INTO inbox_items (title, description, source, source_user, status, conversation, summary)
                     VALUES ($1, $2, 'telegram', $3, 'borrador', $4::jsonb, $5)
                     RETURNING id`,
                    [
                        firstUserMsg.substring(0, 100) || 'Idea desde Telegram',
                        firstUserMsg,
                        ctx.from?.id?.toString() || 'unknown',
                        JSON.stringify(ctx.session.messages),
                        summary,
                    ]
                );
                inboxItemId = result.rows[0].id;
                ctx.session.inboxItemId = inboxItemId;
            } else {
                await pool.query(
                    `UPDATE inbox_items SET summary = $1, conversation = $2::jsonb, status = 'borrador', updated_at = NOW()
                     WHERE id = $3`,
                    [summary, JSON.stringify(ctx.session.messages), inboxItemId]
                );
            }
        } catch (dbErr) {
            await safeDelete(ctx, banner.message_id);
            console.error('[Bot] DB insert error:', dbErr);
            return ctx.reply(`Error DB: ${dbErr.message}`);
        }

        await safeDelete(ctx, banner.message_id);

        ctx.session.phase = 'borrador';

        const displaySummary = summary.length > 600 ? summary.substring(0, 600) + '...' : summary;
        await replyChunked(
            ctx,
            `📝 *Borrador creado* (inbox #${inboxItemId})\n\n${displaySummary}`,
            Markup.inlineKeyboard([
                [
                    Markup.button.callback('🚀 Crear proyecto', 'action_proyecto'),
                    Markup.button.callback('💬 Seguir refinando', 'action_reopen'),
                ],
            ])
        );
    } catch (err) {
        await safeDelete(ctx, banner.message_id);
        console.error('[Bot] handleCreateBorrador unexpected error:', err);
        await ctx.reply(`Error inesperado: ${err.message}`);
    }
}

async function handleCreateProyecto(ctx) {
    if (!ctx.session.inboxItemId) {
        return ctx.reply('No hay borrador activo. Crea uno primero.');
    }

    const banner = await ctx.reply('🚀 _Generando plan maestro..._', { parse_mode: 'Markdown' });

    try {
        const item = await pool.query('SELECT * FROM inbox_items WHERE id = $1', [ctx.session.inboxItemId]);
        if (!item.rows[0]) throw new Error('Inbox item not found');

        const { title, summary } = item.rows[0];
        const projectContext = await buildLightContext(pool);
        const { json: projectData } = await generateProject(title || 'Proyecto desde Telegram', summary, projectContext);

        if (!projectData) throw new Error('No se pudo generar el JSON del proyecto');

        const projectId = await saveProject(projectData);

        await pool.query(
            `UPDATE inbox_items SET structured_data = $1, project_id = $2, department = $3, status = 'proyecto', updated_at = NOW()
             WHERE id = $4`,
            [JSON.stringify(projectData), projectId, projectData.department || null, ctx.session.inboxItemId]
        );

        await safeDelete(ctx, banner.message_id);

        ctx.session.phase = 'done';

        await ctx.reply(
            `✅ *Proyecto creado* — ID: ${projectId}\n\n` +
            `*${projectData.project_name || title}*\n` +
            (projectData.department ? `${projectData.department}` : '') +
            (projectData.estimated_timeline ? ` | ${projectData.estimated_timeline}` : '') +
            `\n\nYa visible en el Dashboard.`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('💡 Nueva idea', 'action_new')],
                ]),
            }
        );

        // Reset session
        ctx.session.messages = [];
        ctx.session.inboxItemId = null;
        ctx.session.editingProjectId = null;
        ctx.session.currentProjectData = null;
    } catch (err) {
        await safeDelete(ctx, banner.message_id);
        await ctx.reply(`Error al crear proyecto: ${err.message}`);
    }
}

async function handleInjectTask(ctx) {
    if (ctx.session.phase !== 'task_proposal') {
        return ctx.reply('No hay ticket pendiente.');
    }

    const lastReply = ctx.session.messages[ctx.session.messages.length - 1].content;
    const taskData = extractJSON(lastReply);

    if (!taskData) return ctx.reply('Error: no se pudo leer el ticket.');

    try {
        await addTaskToProject(ctx.session.editingProjectId, taskData);
        await ctx.reply(
            `✅ *Ticket inyectado* en proyecto #${ctx.session.editingProjectId}`,
            { parse_mode: 'Markdown' }
        );
        ctx.session.editingProjectId = null;
        ctx.session.phase = null;
        ctx.session.messages = [];
    } catch (err) {
        await ctx.reply(`Error al inyectar: ${err.message}`);
    }
}

function resetSession(ctx) {
    ctx.session.messages = [];
    ctx.session.phase = null;
    ctx.session.questionCount = 0;
    ctx.session.inboxItemId = null;
    ctx.session.editingProjectId = null;
    ctx.session.currentProjectData = null;
}

// ─── Comandos ────────────────────────────────────────────────────────────────

bot.command('start', async (ctx) => {
    await ctx.reply(
        `*PM Agent de Emiralia*\n\n` +
        `Transformo ideas en planes ejecutables.\n\n` +
        `/idea — Nueva idea o proyecto\n` +
        `/list — Ver proyectos\n` +
        `/task [ID] [desc] — Inyectar ticket\n` +
        `/skill\\_ranking — Ranking de uso de skills\n` +
        `/cancel — Cancelar sesion\n\n` +
        `Tambien acepto notas de voz 🎙`,
        { parse_mode: 'Markdown' }
    );
});

bot.command('skill_ranking', async (ctx) => {
    const thinking = await ctx.reply('📊 _Consultando datos de uso..._', { parse_mode: 'Markdown' });
    try {
        const rankings = await getSkillRanking({ days: 30, limit: 15 });
        const message = formatSkillRanking(rankings);
        await safeDelete(ctx, thinking.message_id);
        await replyChunked(ctx, message);
    } catch (err) {
        await safeDelete(ctx, thinking.message_id);
        await ctx.reply(`Error: ${err.message}`);
    }
});

bot.command('list', async (ctx) => {
    try {
        const result = await pool.query(
            'SELECT id, name, department, sub_area FROM projects ORDER BY updated_at DESC LIMIT 10'
        );
        if (result.rows.length === 0) {
            return ctx.reply('No hay proyectos todavia. Usa /idea para empezar.');
        }

        let listMsg = '📂 *Proyectos recientes:*\n\n';
        const buttons = [];

        result.rows.forEach(p => {
            listMsg += `• \`${p.id}\` *${p.name}*\n`;
            buttons.push([Markup.button.callback(`✏️ Editar: ${p.name.substring(0, 30)}`, `edit_${p.id}`)]);
        });

        await ctx.reply(listMsg, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(buttons),
        });
    } catch (err) {
        await ctx.reply(`Error al listar: ${err.message}`);
    }
});

bot.command('edit', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const id = args[1];

    if (!id) return ctx.reply('Indica el ID, ej: `/edit 5`', { parse_mode: 'Markdown' });

    try {
        const result = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
        if (result.rows.length === 0) return ctx.reply('No encuentro ese proyecto.');

        const project = result.rows[0];
        ctx.session.messages = [];
        ctx.session.phase = 'reviewing';
        ctx.session.editingProjectId = id;
        ctx.session.currentProjectData = project;

        await ctx.reply(
            `✏️ *Editando: ${project.name}*\n\nDime que quieres cambiar.`,
            { parse_mode: 'Markdown' }
        );
    } catch (err) {
        await ctx.reply(`Error: ${err.message}`);
    }
});

bot.command('task', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const id = args[1];
    const taskPrompt = args.slice(2).join(' ').trim();

    if (!id || !taskPrompt) {
        return ctx.reply('Uso: `/task [ID] [Tarea]`\nEj: `/task 5 Fixear el header`', { parse_mode: 'Markdown' });
    }

    ctx.session.messages = [];
    ctx.session.phase = 'task_proposal';
    ctx.session.editingProjectId = id;

    const thinking = await ctx.reply('🎟️ _Generando ticket..._', { parse_mode: 'Markdown' });

    try {
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 512,
            system: `Eres un PM experto en ticketing agil. Convierte el prompt en un ticket estructurado.
Responde EXCLUSIVAMENTE con un bloque de codigo JSON:
\`\`\`json
{
  "description": "Breve",
  "agent": "Nombre",
  "effort": "S|M|L|XL",
  "type": "Task|Bug|Enhancement",
  "priority": "Low|Medium|High|Critical",
  "justification": "Breve razon"
}
\`\`\``,
            messages: [{ role: 'user', content: taskPrompt }]
        });

        const reply = response.content[0].text;
        ctx.session.messages.push({ role: 'assistant', content: reply });
        const proposal = extractJSON(reply);

        await safeDelete(ctx, thinking.message_id);

        if (!proposal) return ctx.reply('Error al generar el ticket. Intentalo de nuevo.');

        const summary =
            `📌 *Ticket propuesto*\n\n` +
            `*${proposal.description}*\n` +
            `👤 ${proposal.agent} | ⚡ ${proposal.effort} | ${proposal.type}\n` +
            `🔥 ${proposal.priority}\n\n` +
            `_${proposal.justification}_`;

        await ctx.reply(summary, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [
                    Markup.button.callback('✅ Inyectar', 'action_inject_task'),
                    Markup.button.callback('❌ Cancelar', 'action_cancel'),
                ],
            ]),
        });
    } catch (err) {
        await safeDelete(ctx, thinking.message_id);
        await ctx.reply(`Error: ${err.message}`);
    }
});

bot.command('idea', async (ctx) => {
    resetSession(ctx);
    ctx.session.phase = 'reviewing';

    const ideaText = ctx.message.text.replace('/idea', '').trim();

    if (!ideaText) {
        await ctx.reply('Cuentame tu idea. Que quieres construir o mejorar en Emiralia?');
        return;
    }

    await chat(ctx, ideaText);
});

bot.command('ok', async (ctx) => {
    if (ctx.session.phase === 'proposed') {
        await handleCreateBorrador(ctx);
    } else if (ctx.session.phase === 'borrador') {
        await handleCreateProyecto(ctx);
    } else if (ctx.session.phase === 'task_proposal') {
        await handleInjectTask(ctx);
    } else {
        await ctx.reply('No hay propuesta activa. Usa /idea para empezar.');
    }
});

bot.command('cancel', async (ctx) => {
    resetSession(ctx);
    await ctx.reply('Sesion cancelada. Usa /idea cuando quieras.');
});

// ─── Inline Keyboard Actions ────────────────────────────────────────────────

bot.action('action_borrador', async (ctx) => {
    await ctx.answerCbQuery();
    await handleCreateBorrador(ctx);
});

bot.action('action_proyecto', async (ctx) => {
    await ctx.answerCbQuery();
    await handleCreateProyecto(ctx);
});

bot.action('action_inject_task', async (ctx) => {
    await ctx.answerCbQuery();
    await handleInjectTask(ctx);
});

bot.action('action_refine', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.phase = 'reviewing';
    await ctx.reply('Que quieres ajustar de la propuesta?');
});

bot.action('action_reopen', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.phase = 'reviewing';
    await ctx.reply('Que quieres ajustar del borrador?');
});

bot.action('action_cancel', async (ctx) => {
    await ctx.answerCbQuery();
    resetSession(ctx);
    await ctx.reply('Sesion cancelada. Usa /idea cuando quieras.');
});

bot.action('action_new', async (ctx) => {
    await ctx.answerCbQuery();
    resetSession(ctx);
    ctx.session.phase = 'reviewing';
    await ctx.reply('Cuentame tu nueva idea.');
});

// Dynamic edit buttons from /list
bot.action(/^edit_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const id = ctx.match[1];

    try {
        const result = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
        if (!result.rows[0]) return ctx.reply('No encuentro ese proyecto.');

        const project = result.rows[0];
        ctx.session.messages = [];
        ctx.session.phase = 'reviewing';
        ctx.session.editingProjectId = id;
        ctx.session.currentProjectData = project;

        await ctx.reply(
            `✏️ *Editando: ${project.name}*\n\nQue quieres cambiar?`,
            { parse_mode: 'Markdown' }
        );
    } catch (err) {
        await ctx.reply(`Error: ${err.message}`);
    }
});

// ─── Mensajes de texto ──────────────────────────────────────────────────────

bot.on('text', async (ctx) => {
    if (!ctx.session.phase) {
        await ctx.reply(
            'Usa /idea para compartir una propuesta, o /start para ver comandos.',
        );
        return;
    }
    await chat(ctx, ctx.message.text);
});

// ─── Mensajes de voz ────────────────────────────────────────────────────────

bot.on('voice', async (ctx) => {
    if (!ctx.session.phase) {
        await ctx.reply('Usa /idea primero para iniciar una sesion.');
        return;
    }

    const statusMsg = await ctx.reply('🎙️ _Transcribiendo..._', { parse_mode: 'Markdown' });
    try {
        const text = await transcribeAudio(ctx.message.voice.file_id, ctx);
        await safeDelete(ctx, statusMsg.message_id);
        await ctx.reply(`_"${text}"_`, { parse_mode: 'Markdown' });
        await chat(ctx, text);
    } catch (err) {
        await safeDelete(ctx, statusMsg.message_id);
        await ctx.reply(`Error al transcribir: ${err.message}`);
    }
});

// ─── Launch ─────────────────────────────────────────────────────────────────

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  Emiralia — PM Agent Bot (v2)                        ║');
console.log('╚══════════════════════════════════════════════════════╝');
console.log('Bot iniciado. Esperando mensajes en Telegram...\n');

bot.catch((err, ctx) => {
    console.error(`Error for ${ctx.updateType}:`, err.message);
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
