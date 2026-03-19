/**
 * Context Builder — Construye el contexto completo de un agente para Claude API
 *
 * Responsabilidades:
 * - Leer definición del agente desde .claude/agents/
 * - Cargar memoria compartida desde agent_memory
 * - Cargar eventos recientes desde raw_events
 * - Construir system prompt completo con todos los componentes
 * - Cache en memoria para evitar lecturas repetidas
 *
 * Uso:
 *   import { buildAgentContext } from './context-builder.js';
 *   const context = await buildAgentContext('data-agent');
 *   // context: { systemPrompt, agentDef, memory, recentEvents, skills, tools }
 */

import fs from 'fs/promises';
import path from 'path';
import pool from '../db/pool.js';

// Cache de definiciones de agentes (para evitar re-leer archivos)
const agentDefCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Construye el contexto completo de un agente
 * @param {string} agentId - ID del agente (ej: 'data-agent', 'pm-agent')
 * @param {object} options - Opciones adicionales
 * @param {string} options.channel - Canal de comunicación ('telegram' | 'dashboard')
 * @returns {Promise<object>} - Contexto del agente
 */
async function buildAgentContext(agentId, options = {}) {
  const { channel = 'dashboard' } = options;

  try {
    console.log(`[Context Builder] Building context for agent: ${agentId}, channel: ${channel}`);

    // 1. Leer definición del agente
    const agentDef = await loadAgentDefinition(agentId);

    // 2. Cargar memoria compartida
    const memory = await loadAgentMemory(agentId);

    // 3. Cargar eventos recientes
    const recentEvents = await loadRecentEvents(agentId);

    // 4. Construir system prompt
    const systemPrompt = buildSystemPrompt(agentDef, memory, recentEvents, channel);

    return {
      systemPrompt,
      agentDef,
      memory,
      recentEvents,
      skills: agentDef.skills || [],
      tools: agentDef.tools || []
    };
  } catch (error) {
    console.error(`[Context Builder] Error building context for ${agentId}:`, error);
    throw error;
  }
}

/**
 * Lee y parsea la definición del agente desde .claude/agents/
 * @param {string} agentId
 * @returns {Promise<object>} - Definición del agente parseada
 */
async function loadAgentDefinition(agentId) {
  // Verificar cache
  const cached = agentDefCache.get(agentId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Context Builder] Using cached definition for ${agentId}`);
    return cached.data;
  }

  // Buscar archivo del agente en .claude/agents/ (organizados por categoría)
  const agentsBaseDir = path.join(process.cwd(), '.claude', 'agents');
  const categories = ['content', 'data', 'design', 'dev', 'marketing', 'ops', 'product'];

  let agentContent = null;
  let agentFilePath = null;

  // Buscar en cada categoría
  for (const category of categories) {
    const filePath = path.join(agentsBaseDir, category, `${agentId}.md`);
    try {
      agentContent = await fs.readFile(filePath, 'utf-8');
      agentFilePath = filePath;
      break;
    } catch (err) {
      // Archivo no encontrado, continuar
    }
  }

  // Buscar también en la raíz de agents (legacy)
  if (!agentContent) {
    const filePath = path.join(agentsBaseDir, `${agentId}.md`);
    try {
      agentContent = await fs.readFile(filePath, 'utf-8');
      agentFilePath = filePath;
    } catch (err) {
      // No encontrado
    }
  }

  if (!agentContent) {
    throw new Error(`Agent definition not found for: ${agentId}`);
  }

  console.log(`[Context Builder] Loaded agent definition from: ${agentFilePath}`);

  // Parsear markdown (extraer frontmatter y contenido)
  const agentDef = parseAgentMarkdown(agentContent, agentId);

  // Cachear
  agentDefCache.set(agentId, {
    data: agentDef,
    timestamp: Date.now()
  });

  return agentDef;
}

/**
 * Parsea el markdown del agente y extrae información relevante
 * @param {string} markdown
 * @param {string} agentId
 * @returns {object}
 */
function parseAgentMarkdown(markdown, agentId) {
  const lines = markdown.split('\n');

  // Extraer frontmatter (si existe)
  let frontmatter = {};
  if (lines[0] === '---') {
    const endIndex = lines.indexOf('---', 1);
    if (endIndex > 0) {
      const frontmatterLines = lines.slice(1, endIndex);
      frontmatter = parseFrontmatter(frontmatterLines);
    }
  }

  // Extraer skills (buscar sección ## Skills)
  const skills = extractSection(markdown, '## Skills', '##');

  // Extraer tools (buscar sección ## Tools)
  const tools = extractSection(markdown, '## Tools', '##');

  // Extraer role/department de frontmatter o del contenido
  const name = frontmatter.name || extractTitle(markdown);
  const role = frontmatter.role || extractRole(markdown);
  const department = frontmatter.department || '';

  return {
    id: agentId,
    name,
    role,
    department,
    skills: parseListItems(skills),
    tools: parseListItems(tools),
    fullContent: markdown,
    frontmatter
  };
}

/**
 * Parsea frontmatter YAML simple (key: value)
 */
function parseFrontmatter(lines) {
  const frontmatter = {};
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      frontmatter[match[1]] = match[2].trim();
    }
  }
  return frontmatter;
}

/**
 * Extrae una sección del markdown entre dos headers
 */
function extractSection(markdown, startHeader, endHeader) {
  const startIndex = markdown.indexOf(startHeader);
  if (startIndex === -1) return '';

  const afterStart = markdown.substring(startIndex + startHeader.length);
  const endIndex = afterStart.indexOf(endHeader);

  return endIndex === -1
    ? afterStart.trim()
    : afterStart.substring(0, endIndex).trim();
}

/**
 * Extrae el título principal (primer # header)
 */
function extractTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : '';
}

/**
 * Extrae el role de la sección **Role:** o similar
 */
function extractRole(markdown) {
  const match = markdown.match(/\*\*Role:\*\*\s*(.+)/i);
  return match ? match[1].trim() : '';
}

/**
 * Parsea items de una lista markdown (- item o * item)
 */
function parseListItems(section) {
  if (!section) return [];

  const lines = section.split('\n');
  const items = [];

  for (const line of lines) {
    const match = line.match(/^[\s-*]+(.+)$/);
    if (match) {
      items.push(match[1].trim());
    }
  }

  return items;
}

/**
 * Carga memoria compartida del agente desde agent_memory
 * @param {string} agentId
 * @returns {Promise<Array>}
 */
async function loadAgentMemory(agentId) {
  try {
    const result = await pool.query(
      `SELECT key, value, scope, updated_at
       FROM agent_memory
       WHERE agent_id = $1 AND scope = 'shared'
       ORDER BY updated_at DESC
       LIMIT 10`,
      [agentId]
    );

    console.log(`[Context Builder] Loaded ${result.rows.length} shared memory entries for ${agentId}`);
    return result.rows;
  } catch (error) {
    console.error(`[Context Builder] Error loading memory for ${agentId}:`, error);
    return [];
  }
}

/**
 * Carga eventos recientes del agente desde raw_events
 * @param {string} agentId
 * @returns {Promise<Array>}
 */
async function loadRecentEvents(agentId) {
  try {
    const result = await pool.query(
      `SELECT event_type, content, timestamp
       FROM raw_events
       WHERE agent_id = $1
       ORDER BY timestamp DESC
       LIMIT 10`,
      [agentId]
    );

    console.log(`[Context Builder] Loaded ${result.rows.length} recent events for ${agentId}`);
    return result.rows;
  } catch (error) {
    console.error(`[Context Builder] Error loading events for ${agentId}:`, error);
    return [];
  }
}

/**
 * Construye el system prompt completo combinando todos los componentes
 * @param {object} agentDef
 * @param {Array} memory
 * @param {Array} recentEvents
 * @param {string} channel
 * @returns {string}
 */
function buildSystemPrompt(agentDef, memory, recentEvents, channel) {
  const sections = [];

  // 1. Agent Definition
  sections.push('# AGENT IDENTITY\n');
  sections.push(`You are **${agentDef.name}** (${agentDef.id})`);
  if (agentDef.role) {
    sections.push(`Role: ${agentDef.role}`);
  }
  if (agentDef.department) {
    sections.push(`Department: ${agentDef.department}`);
  }
  sections.push('');

  // Incluir contenido completo del agente
  if (agentDef.fullContent) {
    sections.push('# AGENT DEFINITION\n');
    sections.push(agentDef.fullContent);
    sections.push('');
  }

  // 2. Channel-specific constraints
  if (channel === 'telegram') {
    sections.push('# TELEGRAM CONSTRAINTS\n');
    sections.push('- Keep responses under 800 characters when possible');
    sections.push('- Use bullet points for clarity');
    sections.push('- Split long responses into multiple messages');
    sections.push('- Use emojis sparingly for visual hierarchy');
    sections.push('- Avoid complex tables (Telegram has limited formatting)');
    sections.push('');
  }

  // 3. Agent Memory (si existe)
  if (memory.length > 0) {
    sections.push('# YOUR MEMORY (Shared State)\n');
    sections.push('Recent things you should remember:\n');

    for (const entry of memory) {
      const value = typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value);
      const timeAgo = formatTimeAgo(new Date(entry.updated_at));
      sections.push(`- **${entry.key}**: ${value} _(${timeAgo})_`);
    }
    sections.push('');
  }

  // 4. Recent Activity (si existe)
  if (recentEvents.length > 0) {
    sections.push('# RECENT ACTIVITY\n');
    sections.push('Your recent actions:\n');

    for (const event of recentEvents) {
      const timeAgo = formatTimeAgo(new Date(event.timestamp));
      const content = typeof event.content === 'string'
        ? event.content
        : JSON.stringify(event.content);

      sections.push(`- ${timeAgo}: [${event.event_type}] ${truncate(content, 100)}`);
    }
    sections.push('');
  }

  // 5. Available Skills & Tools
  if (agentDef.skills.length > 0) {
    sections.push('# YOUR SKILLS\n');
    sections.push(agentDef.skills.map(s => `- ${s}`).join('\n'));
    sections.push('');
  }

  if (agentDef.tools.length > 0) {
    sections.push('# YOUR TOOLS\n');
    sections.push(agentDef.tools.map(t => `- ${t}`).join('\n'));
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Formatea tiempo relativo (ej: "2h ago", "3d ago")
 */
function formatTimeAgo(date) {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Trunca texto largo
 */
function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Limpia el cache de definiciones de agentes (útil para testing)
 */
function clearCache() {
  agentDefCache.clear();
  console.log('[Context Builder] Cache cleared');
}

export {
  buildAgentContext,
  clearCache
};
