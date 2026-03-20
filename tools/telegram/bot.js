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
import fs from 'fs/promises';
import { Telegraf, session, Markup } from 'telegraf';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { saveProject, updateProject, addTaskToProject } from '../db/save_project.js';
import { PM_SYSTEM_PROMPT, chatWithPMAgent, extractJSON, generateSummary, generateProject } from '../pm-agent/core.js';
import { buildLightContext } from '../pm-agent/context-builder.js';
import { TELEGRAM_PROMPT_WRAPPER } from './telegram-prompt.js';
import { getSkillRanking } from '../db/query_skill_usage.js';
import { formatSkillRanking } from './skill-ranking-prompt.js';
import {
    listAvailableAgents,
    selectAgent,
    getCurrentAgent,
    getAgentInfo,
    getWhoAmIMessage,
    getAgentsListMessage,
    getAgentsKeyboard,
} from './agent-router.js';
import { executeSkill } from './skill-executor.js';
import { handleCRUD } from './crud-handler.js';
import { requireAuthorization } from './auth-middleware.js';
import { rateLimitMiddleware } from './rate-limiter.js';
import { buildAgentContext } from '../core/context-builder.js';
import { generateImageService, parseImageArgs } from '../images/generate-service.js';
import {
    upsertUser,
    getUser,
    setAuthorization,
    listAuthorizedUsers,
    getUserStats,
} from '../db/telegram_user_queries.js';
import pool from '../db/pool.js';
import {
    getConversation,
    saveMessage,
    saveConversation,
    trimConversation,
    deleteConversation
} from '../db/conversation_queries.js';

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

// ─── Auto-Register User Middleware ───────────────────────────────────────────

/**
 * Middleware que registra automáticamente al usuario en telegram_users
 * en cada interacción (mensaje, comando, callback).
 *
 * Esto garantiza que el usuario siempre exista en DB antes de ejecutar
 * cualquier operación que requiera su registro (ej: setActiveAgent).
 *
 * También auto-autoriza como admin si el user_id está en TELEGRAM_ADMIN_IDS.
 */
bot.use(async (ctx, next) => {
    if (ctx.from) {
        try {
            // Parse admin IDs from env
            const adminIds = (process.env.TELEGRAM_ADMIN_IDS || '')
                .split(',')
                .map(id => parseInt(id.trim()))
                .filter(id => !isNaN(id));

            const isAdmin = adminIds.includes(ctx.from.id);

            // Register/update user
            await upsertUser({
                user_id: ctx.from.id,
                username: ctx.from.username,
                first_name: ctx.from.first_name,
                last_name: ctx.from.last_name,
                language_code: ctx.from.language_code || 'es',
            });
            console.log(`[Middleware] User ${ctx.from.id} registered/updated`);

            // Auto-authorize admins on first interaction
            if (isAdmin) {
                const user = await getUser(ctx.from.id);
                if (!user.is_authorized) {
                    await setAuthorization(ctx.from.id, true, 'admin');
                    console.log(`[Middleware] Auto-authorized admin: ${ctx.from.id}`);
                }
            }
        } catch (err) {
            console.error('[Middleware] Error upserting user:', err.message);
            // No bloquear el flujo, continuar de todas formas
        }
    }
    await next();
});

// ─── Load Conversation History Middleware ────────────────────────────────────

/**
 * Middleware que carga la conversación previa del agente activo
 * si existe en DB. Si la sesión está vacía, recupera el historial.
 *
 * Solo carga si:
 * - ctx.session.messages está vacío
 * - El usuario tiene un agente activo
 */
bot.use(async (ctx, next) => {
    // Solo cargar si no hay mensajes en sesión y es un mensaje de texto
    if (ctx.message?.text && ctx.session.messages.length === 0) {
        try {
            const userId = ctx.from.id.toString();
            const agentId = await getCurrentAgent(ctx);

            const conversation = await getConversation(userId, agentId, 'telegram');

            if (conversation && conversation.messages && conversation.messages.length > 0) {
                // Limitar a últimos 50 mensajes para evitar token overflow
                ctx.session.messages = conversation.messages.slice(-50);
                console.log(`[Bot] Loaded ${ctx.session.messages.length} previous messages for user ${userId} with ${agentId}`);
            }
        } catch (err) {
            console.error('[Bot] Error loading conversation (non-blocking):', err.message);
            // No bloquear el flujo, continuar con sesión vacía
        }
    }
    await next();
});

// ─── Authorization Middleware ────────────────────────────────────────────────

/**
 * Middleware que bloquea usuarios no autorizados de ejecutar comandos.
 * Exenta /start y /help para permitir interacción inicial.
 *
 * Feature 11: Security & Auth (Agent Command Center)
 */
bot.use(async (ctx, next) => {
    const exemptCommands = ['/start', '/help'];
    const command = ctx.message?.text?.split(' ')[0];

    if (exemptCommands.includes(command)) {
        return next();
    }

    return requireAuthorization(ctx, next);
});

// ─── Rate Limiting Middleware ────────────────────────────────────────────────

/**
 * Middleware que limita mensajes a 10 por minuto por usuario.
 * Previene spam y abuso del bot.
 *
 * Feature 11: Security & Auth (Agent Command Center)
 */
bot.use(rateLimitMiddleware);

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

        // Persist conversation to DB (non-blocking)
        try {
            const userId = ctx.from.id.toString();
            const agentId = await getCurrentAgent(ctx);

            // Guardar solo los últimos 2 mensajes (user + assistant)
            const newMessages = ctx.session.messages.slice(-2);
            for (const msg of newMessages) {
                await saveMessage(userId, agentId, 'telegram', msg.role, msg.content);
            }

            console.log(`[Bot] Persisted ${newMessages.length} messages for user ${userId}`);

            // Auto-trim si > 100 mensajes
            if (ctx.session.messages.length > 100) {
                await trimConversation(userId, agentId, 'telegram', 50);
                ctx.session.messages = ctx.session.messages.slice(-50);
                console.log(`[Bot] Trimmed to 50 messages`);
            }
        } catch (dbErr) {
            console.error('[Bot] Failed to persist conversation (non-blocking):', dbErr.message);
            // Don't throw - conversation continues in memory
        }

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
 * Chat with any agent using buildAgentContext + Claude API.
 * Used for all agents EXCEPT pm-agent (which uses the legacy chat() flow).
 */
async function chatWithAgent(ctx, userText) {
    const userId = ctx.from.id.toString();
    const agentId = await getCurrentAgent(ctx);

    ctx.session.messages.push({ role: 'user', content: userText });

    const thinkingMsg = await ctx.reply('...');
    const chatId = ctx.chat.id;
    const msgId = thinkingMsg.message_id;

    try {
        // Build agent context (system prompt, memory, events)
        const context = await buildAgentContext(agentId, { channel: 'telegram' });

        // Prepare messages for Claude API (only role + content)
        const apiMessages = ctx.session.messages.map(m => ({ role: m.role, content: m.content }));

        // Stream response from Claude
        let accumulated = '';
        let lastEditAt = 0;
        const EDIT_INTERVAL_MS = 1500;

        const stream = await anthropic.messages.stream({
            model: context.model || 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            system: TELEGRAM_PROMPT_WRAPPER + '\n\n' + context.systemPrompt,
            messages: apiMessages,
        });

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

        // Clean tool_calls XML that Claude sometimes generates as text
        const reply = accumulated
            .replace(/<tool_calls>[\s\S]*?<\/tool_calls>/g, '')
            .replace(/<tool_result>[\s\S]*?<\/tool_result>/g, '')
            .replace(/<invoke[\s\S]*?<\/invoke>/g, '')
            .trim();

        ctx.session.messages.push({ role: 'assistant', content: reply });

        // Persist conversation to DB (non-blocking)
        try {
            const newMessages = ctx.session.messages.slice(-2);
            for (const msg of newMessages) {
                await saveMessage(userId, agentId, 'telegram', msg.role, msg.content);
            }
            console.log(`[Bot] Persisted ${newMessages.length} messages for user ${userId} with ${agentId}`);

            if (ctx.session.messages.length > 100) {
                await trimConversation(userId, agentId, 'telegram', 50);
                ctx.session.messages = ctx.session.messages.slice(-50);
            }
        } catch (dbErr) {
            console.error('[Bot] Failed to persist conversation (non-blocking):', dbErr.message);
        }

        await safeDelete(ctx, msgId);
        await replyChunked(ctx, reply);

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
    console.log('[Handler] /start invoked by user:', ctx.from?.id);

    const currentAgentId = await getCurrentAgent(ctx);
    const agentInfo = getAgentInfo(currentAgentId);
    const agentEmoji = agentInfo?.emoji || '🤖';
    const agentName = agentInfo?.name || 'PM Agent';

    await ctx.reply(
        `${agentEmoji} *${agentName} de Emiralia*\n\n` +
        `*Comandos disponibles:*\n\n` +
        `🤖 *Multi-Agent*\n` +
        `/agents — Ver y seleccionar agente\n` +
        `/whoami — Ver agente activo actual\n` +
        `/skill <nombre> [args] — Ejecutar un skill\n\n` +
        `💡 *PM Agent*\n` +
        `/idea — Nueva idea o proyecto\n` +
        `/list — Ver proyectos\n` +
        `/task [ID] [desc] — Inyectar ticket\n\n` +
        `📝 *CRUD Operations*\n` +
        `/create <tipo> key=value — Crear recurso\n` +
        `/read <tipo> <id> — Leer recurso\n` +
        `/update <tipo> <id> key=value — Actualizar\n` +
        `/delete <tipo> <id> — Borrar recurso\n` +
        `/list <tipo> [filters] — Listar recursos\n\n` +
        `📊 *Utilidades*\n` +
        `/skill\\_ranking — Ranking de uso de skills\n` +
        `/conversation\\_stats — Ver estadísticas del historial\n` +
        `/clear\\_history — Borrar historial de conversación\n` +
        `/cancel — Cancelar sesión\n\n` +
        `*Ejemplos de skills:*\n` +
        `\`/skill consultas-sql city=Dubai\`\n` +
        `\`/skill traducir text="Hello"\`\n\n` +
        `*Ejemplos de CRUD:*\n` +
        `\`/create tasks description="Test" status=pending\`\n` +
        `\`/list projects status=active\`\n` +
        `\`/update tasks 42 status=completed\`\n\n` +
        `También acepto notas de voz 🎙`,
        { parse_mode: 'Markdown' }
    );
});

// ─── Admin Commands (Authorization Management) ───────────────────────────────

bot.command('authorize', async (ctx) => {
    const adminId = ctx.from.id;

    try {
        const adminUser = await getUser(adminId);

        // Only admins can authorize
        if (!adminUser || adminUser.role !== 'admin') {
            return ctx.reply('❌ Solo administradores pueden ejecutar este comando.');
        }

        const args = ctx.message.text.split(' ');
        const targetUserId = args[1];
        const role = args[2] || 'viewer';

        if (!targetUserId) {
            return ctx.reply(
                'Uso: `/authorize <user_id> [role]`\n\n' +
                'Roles disponibles: viewer, operator, admin\n' +
                'Ejemplo: `/authorize 123456789 operator`',
                { parse_mode: 'Markdown' }
            );
        }

        const targetUser = await getUser(parseInt(targetUserId));

        if (!targetUser) {
            return ctx.reply(`❌ Usuario ${targetUserId} no encontrado. Debe interactuar con el bot primero.`);
        }

        const result = await setAuthorization(parseInt(targetUserId), true, role);

        await ctx.reply(
            `✅ Usuario autorizado:\n\n` +
            `👤 ${result.first_name} (@${result.username || 'sin username'})\n` +
            `🔑 Rol: ${result.role}\n` +
            `📅 Autorizado: ${new Date().toLocaleString('es-ES')}`,
            { parse_mode: 'Markdown' }
        );

        // Notify target user
        try {
            await ctx.telegram.sendMessage(
                targetUserId,
                `🎉 ¡Has sido autorizado para usar el bot!\n\nRol: ${role}\n\nUsa /start para comenzar.`
            );
        } catch (err) {
            console.log(`[Bot] Could not notify user ${targetUserId}:`, err.message);
        }

    } catch (err) {
        console.error('[Bot] /authorize error:', err);
        await ctx.reply(`❌ Error: ${err.message}`);
    }
});

bot.command('revoke', async (ctx) => {
    const adminId = ctx.from.id;

    try {
        const adminUser = await getUser(adminId);

        if (!adminUser || adminUser.role !== 'admin') {
            return ctx.reply('❌ Solo administradores pueden ejecutar este comando.');
        }

        const args = ctx.message.text.split(' ');
        const targetUserId = args[1];

        if (!targetUserId) {
            return ctx.reply('Uso: `/revoke <user_id>`', { parse_mode: 'Markdown' });
        }

        const result = await setAuthorization(parseInt(targetUserId), false, 'viewer');

        await ctx.reply(
            `✅ Acceso revocado:\n\n` +
            `👤 ${result.first_name} (@${result.username || 'sin username'})\n` +
            `📅 Revocado: ${new Date().toLocaleString('es-ES')}`,
            { parse_mode: 'Markdown' }
        );

        // Notify target user
        try {
            await ctx.telegram.sendMessage(
                targetUserId,
                `⚠️ Tu acceso al bot ha sido revocado.\n\nContacta al administrador si necesitas acceso.`
            );
        } catch (err) {
            console.log(`[Bot] Could not notify user ${targetUserId}:`, err.message);
        }

    } catch (err) {
        console.error('[Bot] /revoke error:', err);
        await ctx.reply(`❌ Error: ${err.message}`);
    }
});

bot.command('list_users', async (ctx) => {
    const adminId = ctx.from.id;

    try {
        const adminUser = await getUser(adminId);

        if (!adminUser || adminUser.role !== 'admin') {
            return ctx.reply('❌ Solo administradores pueden ejecutar este comando.');
        }

        const stats = await getUserStats();
        const authorized = await listAuthorizedUsers();

        let message = '📊 *Usuarios del Bot*\n\n';
        message += `Total: ${stats.overall.total_users}\n`;
        message += `Autorizados: ${stats.overall.authorized_users}\n`;
        message += `No autorizados: ${stats.overall.unauthorized_users}\n\n`;
        message += `Admins: ${stats.overall.admins}\n`;
        message += `Operators: ${stats.overall.operators}\n`;
        message += `Viewers: ${stats.overall.viewers}\n\n`;
        message += `Activos (7 días): ${stats.overall.active_last_7_days}\n`;
        message += `Activos (30 días): ${stats.overall.active_last_30_days}\n\n`;
        message += '*Usuarios Autorizados:*\n\n';

        for (const user of authorized.slice(0, 10)) {
            message += `${user.user_id} - ${user.first_name} (@${user.username || 'sin username'}) - ${user.role}\n`;
        }

        if (authorized.length > 10) {
            message += `\n_...y ${authorized.length - 10} más_`;
        }

        await ctx.reply(message, { parse_mode: 'Markdown' });

    } catch (err) {
        console.error('[Bot] /list_users error:', err);
        await ctx.reply(`❌ Error: ${err.message}`);
    }
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

bot.command('agents', async (ctx) => {
    try {
        const message = await getAgentsListMessage();
        const keyboard = await getAgentsKeyboard();

        console.log('[Bot] /agents command triggered');
        console.log(`[Bot] Message length: ${message.length}`);
        console.log(`[Bot] Keyboard buttons: ${keyboard.flat().length}`);

        if (keyboard.flat().length === 0) {
            console.error('[Bot] ⚠️ WARNING: No agents found! Keyboard is empty.');
            await ctx.reply(
                '⚠️ No se pudieron cargar los agentes. Por favor contacta al administrador.\n\n' +
                'Debug: listAvailableAgents() retornó array vacío.',
                { parse_mode: 'Markdown' }
            );
            return;
        }

        await ctx.reply(message, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: keyboard,
            },
        });

        console.log('[Bot] /agents response sent successfully');
    } catch (err) {
        console.error('[Bot] /agents error:', err);
        await ctx.reply(`Error al cargar agentes: ${err.message}`);
    }
});

bot.command('agent', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const agentId = args[1];

    if (!agentId) {
        return ctx.reply(
            'Indica el ID del agente, ej: `/agent data-agent`\n\nUsa /agents para ver la lista completa.',
            { parse_mode: 'Markdown' }
        );
    }

    const thinking = await ctx.reply('🔄 _Cambiando agente..._', { parse_mode: 'Markdown' });

    try {
        const result = await selectAgent(ctx, agentId);

        await safeDelete(ctx, thinking.message_id);

        if (result.success) {
            await ctx.reply(result.message, { parse_mode: 'Markdown' });
        } else {
            await ctx.reply(result.message);
        }
    } catch (err) {
        await safeDelete(ctx, thinking.message_id);
        await ctx.reply(`Error: ${err.message}`);
    }
});

bot.command('whoami', async (ctx) => {
    try {
        const message = await getWhoAmIMessage(ctx);
        await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (err) {
        console.error('[Bot] /whoami error:', err);
        await ctx.reply(`Error: ${err.message}`);
    }
});

bot.command('skill', async (ctx) => {
    const args = ctx.message.text.split(/\s+/);
    const skillName = args[1];
    const skillArgs = args.slice(2).join(' ').trim();

    if (!skillName) {
        return ctx.reply(
            'Uso: `/skill <nombre> [argumentos]`\n\n' +
            'Ejemplo: `/skill consultas-sql city=Dubai`\n' +
            'Ejemplo: `/skill traducir text="Hello" variant=es-MX`\n\n' +
            'Usa /whoami para ver skills disponibles del agente activo.',
            { parse_mode: 'Markdown' }
        );
    }

    const startTime = Date.now();

    try {
        console.log(`[Bot] /skill ${skillName} invoked with args: ${skillArgs || '(none)'}`);

        const result = await executeSkill(ctx, skillName, skillArgs);

        if (!result.success) {
            return ctx.reply(result.message, { parse_mode: 'Markdown' });
        }

        // Success message already sent by executeSkill (streaming + chunks)
        const duration = Date.now() - startTime;
        console.log(`[Bot] Skill executed: ${skillName} in ${duration}ms`);

    } catch (err) {
        await handleSkillExecutionError(ctx, err, skillName);
    }
});

/**
 * Error handler para ejecución de skills
 */
async function handleSkillExecutionError(ctx, error, skillName) {
    const errorMessages = {
        'ENOENT': `❌ Skill '${skillName}' no encontrado.`,
        'EACCES': `❌ Permiso denegado para ejecutar '${skillName}'.`,
        'ETIMEDOUT': `⏱️ Timeout: '${skillName}' tardó más de 30 segundos.`,
        'ECONNREFUSED': `❌ Error de conexión con Claude API.`,
    };

    const message = errorMessages[error.code] || `❌ Error: ${error.message}`;

    await ctx.reply(message);

    console.error('[SkillExecutor] Error:', {
        skill: skillName,
        error: error.message,
        code: error.code,
        stack: error.stack,
    });
}

// ─── CRUD Commands ───────────────────────────────────────────────────────────

bot.command('create', async (ctx) => {
    const text = ctx.message.text.replace('/create ', '');
    await handleCRUD('create', null, text, ctx);
});

bot.command('read', async (ctx) => {
    const text = ctx.message.text.replace('/read ', '');
    await handleCRUD('read', null, text, ctx);
});

bot.command('update', async (ctx) => {
    const text = ctx.message.text.replace('/update ', '');
    await handleCRUD('update', null, text, ctx);
});

bot.command('delete', async (ctx) => {
    const text = ctx.message.text.replace('/delete ', '');
    await handleCRUD('delete', null, text, ctx);
});

bot.command('list', async (ctx) => {
    const text = ctx.message.text.replace('/list ', '');

    // If no args, default to listing projects (backward compatibility)
    if (!text || text.trim() === '') {
        await handleCRUD('list', null, 'projects', ctx);
    } else {
        await handleCRUD('list', null, text, ctx);
    }
});

// ─── Conversation Management Commands ────────────────────────────────────────

bot.command('clear_history', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const agentId = await getCurrentAgent(ctx);

        await deleteConversation(userId, agentId, 'telegram');
        resetSession(ctx);

        await ctx.reply('✅ Historial de conversación borrado. Empezamos desde cero.', {
            parse_mode: 'Markdown'
        });
    } catch (err) {
        await ctx.reply(`❌ Error al borrar historial: ${err.message}`);
    }
});

bot.command('conversation_stats', async (ctx) => {
    try {
        const userId = ctx.from.id.toString();
        const agentId = await getCurrentAgent(ctx);

        const conversation = await getConversation(userId, agentId, 'telegram');

        if (!conversation) {
            return ctx.reply('No hay historial de conversación con este agente.');
        }

        const messageCount = conversation.messages.length;
        const userMessages = conversation.messages.filter(m => m.role === 'user').length;
        const assistantMessages = conversation.messages.filter(m => m.role === 'assistant').length;
        const lastMessageDate = new Date(conversation.last_message_at).toLocaleString('es-ES');

        await ctx.reply(
            `📊 *Estadísticas de Conversación*\n\n` +
            `📝 Total mensajes: ${messageCount}\n` +
            `👤 Tus mensajes: ${userMessages}\n` +
            `🤖 Respuestas del agente: ${assistantMessages}\n` +
            `🕐 Último mensaje: ${lastMessageDate}`,
            { parse_mode: 'Markdown' }
        );
    } catch (err) {
        await ctx.reply(`❌ Error al obtener estadísticas: ${err.message}`);
    }
});

// ─── Other Commands ───────────────────────────────────────────────────────────

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

bot.command('admin_fix_sequences', async (ctx) => {
    try {
        await ctx.reply('🔧 Reseteando secuencias de base de datos...');

        const client = await pool.connect();
        try {
            const tables = ['projects', 'phases', 'tasks'];
            const results = [];

            for (const table of tables) {
                const res = await client.query(`
                    SELECT setval('${table}_id_seq',
                        (SELECT COALESCE(MAX(id), 0) + 1 FROM ${table}),
                        false
                    )
                `);
                results.push(`${table}_id_seq → ${res.rows[0].setval}`);
            }

            await ctx.reply(`✅ Secuencias reseteadas:\n${results.join('\n')}\n\nYa puedes crear proyectos sin error.`);
        } finally {
            client.release();
        }
    } catch (error) {
        await ctx.reply(`❌ Error: ${error.message}`);
    }
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

// Agent selection from /agents keyboard
bot.action(/^select_agent:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const agentId = ctx.match[1];

    try {
        const result = await selectAgent(ctx, agentId);

        if (result.success) {
            // Guardar conversación actual antes de cambiar
            try {
                const userId = ctx.from.id.toString();
                const oldAgentId = await getCurrentAgent(ctx);

                if (ctx.session.messages.length > 0) {
                    await saveConversation(userId, oldAgentId, 'telegram', ctx.session.messages);
                    console.log(`[Bot] Saved ${ctx.session.messages.length} messages for ${oldAgentId} before switching`);
                }
            } catch (err) {
                console.error('[Bot] Error saving conversation on switch:', err.message);
            }

            // Reset session when changing agents (middleware will load new conversation on next message)
            resetSession(ctx);

            await ctx.reply(result.message, { parse_mode: 'Markdown' });
        } else {
            await ctx.reply(result.message);
        }
    } catch (err) {
        console.error('[Bot] select_agent error:', err);
        await ctx.reply(`Error al cambiar agente: ${err.message}`);
    }
});

// ─── Generacion de imagenes ─────────────────────────────────────────────────

bot.command('generar_imagen', async (ctx) => {
    const rawArgs = ctx.message.text.replace(/^\/generar_imagen\s*/, '');
    await handleImageGeneration(ctx, rawArgs);
});

// Also catch /generar-imagen as text (Telegram converts hyphens to underscores in commands)
// This is handled in the text handler below for messages starting with /generar-imagen

/**
 * Shared image generation handler for Telegram
 */
async function handleImageGeneration(ctx, rawArgs) {
    const { prompt, size, quality } = parseImageArgs(rawArgs);

    if (!prompt) {
        await ctx.reply('Se requiere una descripcion.\n\nUso: /generar-imagen <descripcion> [--size=square] [--quality=standard]');
        return;
    }

    const statusMsg = await ctx.reply('_Generando imagen..._', { parse_mode: 'Markdown' });

    try {
        const userId = ctx.from.id.toString();
        const agentId = await getCurrentAgent(ctx);

        const result = await generateImageService({
            prompt,
            size,
            quality,
            generatedBy: `telegram:${userId}`,
            agentId,
        });

        await safeDelete(ctx, statusMsg.message_id);

        // Send image to Telegram as buffer (result.url is a local path, not a public URL)
        const imgBuffer = await fs.readFile(result.path);
        await ctx.replyWithPhoto(
            { source: imgBuffer, filename: result.filename },
            {
                caption: `*${result.filename}*\nTamano: ${result.size} | Calidad: ${result.quality}\nCosto: $${result.cost} USD\n\n_${result.revisedPrompt || result.prompt}_`,
                parse_mode: 'Markdown',
            }
        );

        // Persist to conversation so Dashboard can see it
        const summary = `Imagen generada: ${result.filename}\nURL: ${result.url}\nTamano: ${result.size} (${result.quality})\nCosto: $${result.cost} USD\nPrompt: ${result.revisedPrompt || result.prompt}`;
        await saveMessage(userId, agentId, 'telegram', 'user', `/generar-imagen ${rawArgs}`);
        await saveMessage(userId, agentId, 'telegram', 'assistant', summary);

        console.log(`[Bot] Image generated for user ${userId}: ${result.filename}`);
    } catch (err) {
        await safeDelete(ctx, statusMsg.message_id);
        console.error('[Bot] Image generation error:', err);
        await ctx.reply(`Error generando imagen: ${err.message}`);
    }
}

// ─── Mensajes de texto ──────────────────────────────────────────────────────

bot.on('text', async (ctx) => {
    // Intercept /generar-imagen (with hyphen) since Telegram only registers underscore commands
    if (ctx.message.text.startsWith('/generar-imagen')) {
        const rawArgs = ctx.message.text.replace(/^\/generar-imagen\s*/, '');
        await handleImageGeneration(ctx, rawArgs);
        return;
    }

    const agentId = await getCurrentAgent(ctx);

    console.log('[Handler] Text message received:', {
        from: ctx.from?.id,
        text: ctx.message.text.substring(0, 50),
        phase: ctx.session.phase,
        agent: agentId
    });

    // PM Agent keeps the legacy workflow (requires /idea to start)
    if (agentId === 'pm-agent') {
        if (!ctx.session.phase) {
            await ctx.reply(
                'Estas con el PM Agent. Usa /idea para compartir una propuesta, o /agents para cambiar de agente.',
            );
            return;
        }
        await chat(ctx, ctx.message.text);
        return;
    }

    // All other agents: free chat without phase gate
    await chatWithAgent(ctx, ctx.message.text);
});

// ─── Mensajes de voz ────────────────────────────────────────────────────────

bot.on('voice', async (ctx) => {
    const agentId = await getCurrentAgent(ctx);

    // PM Agent requires /idea phase
    if (agentId === 'pm-agent' && !ctx.session.phase) {
        await ctx.reply('Estas con el PM Agent. Usa /idea primero para iniciar una sesion.');
        return;
    }

    const statusMsg = await ctx.reply('_Transcribiendo..._', { parse_mode: 'Markdown' });
    try {
        const text = await transcribeAudio(ctx.message.voice.file_id, ctx);
        await safeDelete(ctx, statusMsg.message_id);
        await ctx.reply(`_"${text}"_`, { parse_mode: 'Markdown' });

        if (agentId === 'pm-agent') {
            await chat(ctx, text);
        } else {
            await chatWithAgent(ctx, text);
        }
    } catch (err) {
        await safeDelete(ctx, statusMsg.message_id);
        await ctx.reply(`Error al transcribir: ${err.message}`);
    }
});

// ─── Launch ─────────────────────────────────────────────────────────────────

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  Emiralia — PM Agent Bot (v2)                        ║');
console.log('╚══════════════════════════════════════════════════════╝');

bot.catch((err, ctx) => {
    console.error('[Bot Error]', {
        type: ctx.updateType,
        error: err.message,
        stack: err.stack
    });
});

// Enhanced launch con verificación de DB
(async () => {
    try {
        console.log('[Bot] Testing database connection...');
        await pool.query('SELECT NOW()');
        console.log('[Bot] ✅ Database connection OK');

        console.log('[Bot] Launching bot with long polling...');
        await bot.launch();

        console.log('[Bot] ✅ Bot is listening for updates');
        console.log('[Bot] Try /start in Telegram\n');
    } catch (err) {
        console.error('[Bot] ❌ Failed to launch:', {
            error: err.message,
            stack: err.stack
        });
        process.exit(1);
    }
})();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
