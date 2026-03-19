/**
 * Emiralia — Agent Router (Telegram)
 *
 * Permite seleccionar y cambiar entre los 9 agentes especializados desde Telegram.
 *
 * Funciones principales:
 * - listAvailableAgents() — retorna lista de agentes con descripción
 * - selectAgent(ctx, agentId) — cambia el agente activo y persiste en DB
 * - getCurrentAgent(ctx) — retorna el agente activo actual
 * - getAgentInfo(agentId) — retorna información detallada de un agente
 *
 * Uso:
 *   import { listAvailableAgents, selectAgent, getCurrentAgent } from './agent-router.js';
 *
 * Feature: Agent Command Center - Feature 4
 * Status: In Development
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { setActiveAgent, getActiveAgent } from '../db/telegram_user_queries.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Constants ───────────────────────────────────────────────────────────────

const AGENT_CATEGORIES = ['content', 'data', 'design', 'dev', 'marketing', 'ops', 'product'];
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const AGENTS_DIR = process.env.AGENTS_DIR || path.join(PROJECT_ROOT, 'claude/agents');

/**
 * Metadata de agentes con emojis y descripciones cortas.
 * Usado para el comando /agents.
 */
const AGENT_METADATA = {
    'content-agent': { emoji: '✍️', shortDesc: 'Listings & Content Creation' },
    'translation-agent': { emoji: '🌐', shortDesc: 'Español <> English' },
    'data-agent': { emoji: '📊', shortDesc: 'Scraping & Analytics' },
    'frontend-agent': { emoji: '🎨', shortDesc: 'UI/UX & Design System' },
    'dev-agent': { emoji: '⚙️', shortDesc: 'Backend & Features' },
    'pm-agent': { emoji: '📋', shortDesc: 'Planning & Coordination' },
    'marketing-agent': { emoji: '📣', shortDesc: 'Campaigns & Growth' },
    'research-agent': { emoji: '🔍', shortDesc: 'Intelligence & Monitoring' },
    'wat-auditor-agent': { emoji: '🔬', shortDesc: 'System Audits & Improvements' },
};

// ─── Cache de Definiciones ──────────────────────────────────────────────────

let agentDefinitionsCache = null;
let cacheTimestamp = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extrae skills del contenido markdown.
 * Busca sección "## Skills disponibles" y extrae los skill names.
 */
function extractSkills(content) {
    const skillsSection = content.match(/##\s+Skills\s+disponibles([\s\S]*?)(?=##|$)/i);
    if (!skillsSection) return [];

    const skillMatches = skillsSection[1].matchAll(/`\/([\w-]+)`/g);
    return Array.from(skillMatches, m => m[1]);
}

/**
 * Extrae tools del contenido markdown.
 * Busca sección "## Tools disponibles" y extrae los tool paths.
 */
function extractTools(content) {
    const toolsSection = content.match(/##\s+Tools\s+disponibles([\s\S]*?)(?=##|$)/i);
    if (!toolsSection) return [];

    const toolMatches = toolsSection[1].matchAll(/`(tools\/[\w\/.-]+\.js)`/g);
    return Array.from(toolMatches, m => m[1]);
}

/**
 * Extrae el departamento del contenido o lo infiere de la categoría.
 */
function extractDepartment(content, category) {
    // Try to extract from content first
    const deptMatch = content.match(/\*\*Departamento:\*\*\s+(\w+)/i);
    if (deptMatch) return deptMatch[1];

    // Fallback to category mapping
    const categoryToDept = {
        'content': 'Content',
        'data': 'Data',
        'design': 'Design',
        'dev': 'Development',
        'marketing': 'Marketing',
        'ops': 'Operations',
        'product': 'Product',
    };

    return categoryToDept[category] || 'Unknown';
}

/**
 * Lee y parsea la definición de un agente desde su archivo .md
 */
function readAgentDefinition(agentId) {
    for (const category of AGENT_CATEGORIES) {
        const filePath = path.join(AGENTS_DIR, category, `${agentId}.md`);
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf-8');
            const parsed = matter(raw);

            // Extract additional info from content
            const skills = extractSkills(parsed.content);
            const tools = extractTools(parsed.content);
            const department = extractDepartment(parsed.content, category);

            return {
                ...parsed.data,
                content: parsed.content,
                category,
                filePath,
                skills,
                tools,
                department,
            };
        }
    }
    return null;
}

/**
 * Carga definiciones de agentes desde filesystem.
 * @returns {Object|null} Diccionario de definiciones o null si falla
 */
function loadAllAgentDefinitionsFromFilesystem() {
    try {
        const definitions = {};

        for (const category of AGENT_CATEGORIES) {
            const categoryPath = path.join(AGENTS_DIR, category);
            if (!fs.existsSync(categoryPath)) {
                console.log(`[Agent Router] Category not found: ${categoryPath}`);
                continue;
            }

            const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.md'));

            for (const file of files) {
                const agentId = file.replace('.md', '');
                const def = readAgentDefinition(agentId);
                if (def) {
                    definitions[agentId] = def;
                }
            }
        }

        return Object.keys(definitions).length > 0 ? definitions : null;
    } catch (err) {
        console.error('[Agent Router] Filesystem load error:', err.message);
        return null;
    }
}

/**
 * Retorna fallback hardcoded basado en AGENT_METADATA.
 * Usado como último recurso si filesystem y DB fallan.
 * @returns {Object} Diccionario de definiciones mínimas
 */
function getHardcodedAgentFallback() {
    const fallback = {};
    for (const [agentId, meta] of Object.entries(AGENT_METADATA)) {
        fallback[agentId] = {
            name: agentId.replace('-agent', ' Agent').replace(/\b\w/g, l => l.toUpperCase()),
            role: meta.shortDesc,
            department: 'unknown',
            skills: [],
            tools: [],
        };
    }
    console.log(`[Agent Router] Using hardcoded fallback (${Object.keys(fallback).length} agents)`);
    return fallback;
}

/**
 * Carga todas las definiciones de agentes con fallback automático.
 * Estrategia: filesystem → hardcoded fallback
 * @returns {Object} Diccionario de definiciones
 */
function loadAllAgentDefinitions() {
    const now = Date.now();

    // Return cached if still valid
    if (agentDefinitionsCache && cacheTimestamp && (now - cacheTimestamp < CACHE_TTL_MS)) {
        console.log('[Agent Router] Using cached definitions');
        return agentDefinitionsCache;
    }

    console.log('[Agent Router] Loading agent definitions...');

    // STRATEGY 1: Try filesystem first (desarrollo local)
    let definitions = loadAllAgentDefinitionsFromFilesystem();

    if (definitions && Object.keys(definitions).length > 0) {
        console.log(`[Agent Router] ✅ Loaded ${Object.keys(definitions).length} agents from FILESYSTEM`);
        agentDefinitionsCache = definitions;
        cacheTimestamp = now;
        return definitions;
    }

    // STRATEGY 2: Fallback hardcoded (producción/Railway)
    console.warn('[Agent Router] ⚠️ Filesystem failed, using hardcoded fallback...');
    definitions = getHardcodedAgentFallback();

    agentDefinitionsCache = definitions;
    cacheTimestamp = now;

    return definitions;
}

/**
 * Formatea una lista de skills para mostrar en Telegram.
 * Limita a los primeros 3-5 skills para no saturar el mensaje.
 */
function formatSkillsList(skills, maxSkills = 5) {
    if (!skills || skills.length === 0) return 'Ninguno';

    const displaySkills = skills.slice(0, maxSkills);
    const remaining = skills.length - displaySkills.length;

    let result = displaySkills.map(s => `• /${s}`).join('\n');
    if (remaining > 0) {
        result += `\n• ... y ${remaining} más`;
    }

    return result;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Lista todos los agentes disponibles con metadata.
 *
 * @returns {Array<Object>} Lista de agentes con { id, name, emoji, shortDesc, skills, tools }
 */
export function listAvailableAgents() {
    const definitions = loadAllAgentDefinitions();
    const agents = [];

    for (const [agentId, def] of Object.entries(definitions)) {
        const metadata = AGENT_METADATA[agentId] || { emoji: '🤖', shortDesc: 'Agent' };

        agents.push({
            id: agentId,
            name: def.name || agentId,
            emoji: metadata.emoji,
            shortDesc: metadata.shortDesc,
            skills: def.skills || [],
            tools: def.tools || [],
            department: def.department || 'Unknown',
        });
    }

    // Sort by department for better organization
    agents.sort((a, b) => {
        const order = ['ops', 'product', 'content', 'design', 'dev', 'data', 'marketing'];
        return order.indexOf(a.department) - order.indexOf(b.department);
    });

    return agents;
}

/**
 * Obtiene información detallada de un agente específico.
 *
 * @param {string} agentId - ID del agente (ej: 'data-agent')
 * @returns {Object|null} Definición completa del agente o null si no existe
 */
export function getAgentInfo(agentId) {
    const definitions = loadAllAgentDefinitions();
    const def = definitions[agentId];

    if (!def) return null;

    const metadata = AGENT_METADATA[agentId] || { emoji: '🤖', shortDesc: 'Agent' };

    return {
        id: agentId,
        name: def.name || agentId,
        emoji: metadata.emoji,
        shortDesc: metadata.shortDesc,
        description: def.description || '',
        role: def.role || '',
        department: def.department || 'Unknown',
        skills: def.skills || [],
        tools: def.tools || [],
        model: def.model || 'sonnet',
        content: def.content || '',
    };
}

/**
 * Obtiene el agente activo actual para un usuario de Telegram.
 *
 * @param {Object} ctx - Contexto de Telegraf
 * @returns {Promise<string>} ID del agente activo (default: 'pm-agent')
 */
export async function getCurrentAgent(ctx) {
    const userId = ctx.from?.id?.toString();
    if (!userId) return 'pm-agent'; // Default fallback

    try {
        const activeAgentId = await getActiveAgent(userId);
        return activeAgentId || 'pm-agent';
    } catch (err) {
        console.error('[AgentRouter] Error getting current agent:', err);
        return 'pm-agent';
    }
}

/**
 * Cambia el agente activo para un usuario de Telegram.
 * Persiste el cambio en la DB (telegram_users.active_agent_id).
 *
 * @param {Object} ctx - Contexto de Telegraf
 * @param {string} agentId - ID del nuevo agente (ej: 'data-agent')
 * @returns {Promise<Object>} { success: boolean, agent: Object, message: string }
 */
export async function selectAgent(ctx, agentId) {
    const userId = ctx.from?.id?.toString();
    if (!userId) {
        return {
            success: false,
            message: '❌ No se pudo identificar tu usuario de Telegram.',
        };
    }

    // Verificar que el agente existe
    const agentInfo = getAgentInfo(agentId);
    if (!agentInfo) {
        const available = listAvailableAgents().map(a => a.id).join(', ');
        return {
            success: false,
            message: `❌ Agente "${agentId}" no existe.\n\nDisponibles: ${available}`,
        };
    }

    // Persistir en DB
    try {
        await setActiveAgent(userId, agentId);
    } catch (err) {
        console.error('[AgentRouter] Error setting active agent:', err);
        return {
            success: false,
            message: `❌ Error al guardar el agente activo: ${err.message}`,
        };
    }

    // Construir mensaje de confirmación
    const skillsFormatted = formatSkillsList(agentInfo.skills, 5);
    const message = [
        `${agentInfo.emoji} *Ahora hablas con ${agentInfo.name}*`,
        '',
        `📋 *Rol:* ${agentInfo.shortDesc}`,
        `🏢 *Departamento:* ${agentInfo.department}`,
        '',
        `⚡ *Skills disponibles:*`,
        skillsFormatted,
        '',
        `🔧 *Tools:* ${agentInfo.tools.length} disponibles`,
        '',
        '_Usa /whoami para ver detalles o /agents para cambiar._',
    ].join('\n');

    return {
        success: true,
        agent: agentInfo,
        message,
    };
}

/**
 * Obtiene un resumen del estado actual del usuario:
 * - Agente activo
 * - Skills disponibles
 * - Última actividad (opcional)
 *
 * @param {Object} ctx - Contexto de Telegraf
 * @returns {Promise<string>} Mensaje formateado para Telegram
 */
export async function getWhoAmIMessage(ctx) {
    const userId = ctx.from?.id?.toString();
    const username = ctx.from?.username || ctx.from?.first_name || 'Usuario';

    const agentId = await getCurrentAgent(ctx);
    const agentInfo = getAgentInfo(agentId);

    if (!agentInfo) {
        return `❌ Error: No se pudo cargar la información del agente activo (${agentId}).`;
    }

    const skillsFormatted = formatSkillsList(agentInfo.skills, 8);

    const message = [
        `👤 *Usuario:* ${username} (\`${userId}\`)`,
        '',
        `${agentInfo.emoji} *Agente activo:* ${agentInfo.name}`,
        `📋 *Rol:* ${agentInfo.shortDesc}`,
        `🏢 *Departamento:* ${agentInfo.department}`,
        '',
        `⚡ *Skills disponibles:*`,
        skillsFormatted,
        '',
        `🔧 *Tools:* ${agentInfo.tools.length} disponibles`,
        '',
        `_Usa /agents para cambiar de agente._`,
    ].join('\n');

    return message;
}

/**
 * Genera el mensaje formateado para el comando /agents
 * con inline keyboard buttons.
 *
 * @returns {string} Mensaje formateado para Telegram
 */
export function getAgentsListMessage() {
    const agents = listAvailableAgents();

    const header = [
        `🤖 *Agentes Disponibles*`,
        '',
        `Selecciona un agente para cambiar el modo de operación:`,
        '',
    ].join('\n');

    const agentLines = agents.map(a =>
        `${a.emoji} *${a.name}*\n   ${a.shortDesc} (${a.skills.length} skills)`
    ).join('\n\n');

    const footer = [
        '',
        '',
        '_Toca un botón para seleccionar el agente._',
    ].join('\n');

    return header + agentLines + footer;
}

/**
 * Genera los inline keyboard buttons para el comando /agents.
 * Retorna un array de arrays para usar con Telegraf Markup.
 *
 * @returns {Array<Array<Object>>} Keyboard layout para Markup.inlineKeyboard()
 */
export function getAgentsKeyboard() {
    const agents = listAvailableAgents();

    // Group agents in rows of 2
    const keyboard = [];
    for (let i = 0; i < agents.length; i += 2) {
        const row = [];

        const agent1 = agents[i];
        row.push({
            text: `${agent1.emoji} ${agent1.name}`,
            callback_data: `select_agent:${agent1.id}`,
        });

        if (i + 1 < agents.length) {
            const agent2 = agents[i + 1];
            row.push({
                text: `${agent2.emoji} ${agent2.name}`,
                callback_data: `select_agent:${agent2.id}`,
            });
        }

        keyboard.push(row);
    }

    return keyboard;
}

// ─── CLI Testing ─────────────────────────────────────────────────────────────

// Check if this file is being run directly
const isMainModule = import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`;

if (isMainModule || process.argv[1]?.endsWith('agent-router.js')) {
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║  Agent Router — Test Suite                          ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');

    console.log('📋 listAvailableAgents():');
    const agents = listAvailableAgents();
    console.log(`Found ${agents.length} agents:\n`);
    agents.forEach(a => {
        console.log(`${a.emoji} ${a.name} (${a.id})`);
        console.log(`   ${a.shortDesc}`);
        console.log(`   Skills: ${a.skills.length} | Tools: ${a.tools.length}`);
        console.log('');
    });

    console.log('\n🔍 getAgentInfo("data-agent"):');
    const dataAgent = getAgentInfo('data-agent');
    if (dataAgent) {
        console.log(`${dataAgent.emoji} ${dataAgent.name}`);
        console.log(`Role: ${dataAgent.role || 'N/A'}`);
        console.log(`Department: ${dataAgent.department}`);
        console.log(`Skills (${dataAgent.skills.length}): ${dataAgent.skills.join(', ')}`);
        console.log(`Tools (${dataAgent.tools.length}): ${dataAgent.tools.slice(0, 3).join(', ')}${dataAgent.tools.length > 3 ? '...' : ''}`);
    } else {
        console.log('❌ Agent not found');
    }

    console.log('\n📄 getAgentsListMessage():');
    console.log(getAgentsListMessage());

    console.log('\n⌨️  getAgentsKeyboard():');
    const keyboard = getAgentsKeyboard();
    console.log(JSON.stringify(keyboard, null, 2));

    console.log('\n✅ Test suite completed\n');
}
