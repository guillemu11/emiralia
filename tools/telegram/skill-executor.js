/**
 * Skill Executor — Ejecuta skills desde Telegram
 *
 * Responsabilidades:
 * - Buscar y parsear skill definitions desde .claude/skills/
 * - Construir prompts combinando contexto del agente + instrucciones del skill
 * - Invocar Claude API con streaming optimizado para Telegram
 * - Manejar skills con disable-model-invocation (ejecución directa de tools)
 * - Logging en raw_events con trackSkill
 *
 * Uso:
 *   import { executeSkill } from './skill-executor.js';
 *   const result = await executeSkill(ctx, 'consultas-sql', 'city=Dubai');
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import matter from 'gray-matter';
import Anthropic from '@anthropic-ai/sdk';
import { buildAgentContext } from '../core/context-builder.js';
import { getCurrentAgent } from './agent-router.js';
import { logEvent, EVENT_TYPES } from '../core/event-logger.js';
import { sanitizeInput } from './input-sanitizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Constants ───────────────────────────────────────────────────────────────

const SKILL_DOMAINS = ['ops', 'content', 'design', 'producto', 'gtm', 'ejecucion', 'marketing', 'data'];
const SKILLS_BASE_DIR = path.join(process.cwd(), 'claude', 'skills');
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const EDIT_INTERVAL_MS = 1500; // Update streaming message every 1.5s

// ─── Cache ───────────────────────────────────────────────────────────────────

const skillDefinitionCache = new Map();

function getCachedSkill(skillName) {
  const cached = skillDefinitionCache.get(skillName);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[SkillExecutor] Using cached definition for ${skillName}`);
    return cached.data;
  }
  return null;
}

function setCachedSkill(skillName, data) {
  skillDefinitionCache.set(skillName, {
    data,
    timestamp: Date.now(),
  });
}

// ─── Skill Discovery & Loading ───────────────────────────────────────────────

/**
 * Busca y parsea skill definition desde .claude/skills/<domain>/<skill-name>/SKILL.md
 * @param {string} skillName - Nombre del skill (ej: 'consultas-sql')
 * @returns {Promise<object|null>} - Skill definition parseada o null si no existe
 */
export async function getSkillDefinition(skillName) {
  // Verificar cache
  const cached = getCachedSkill(skillName);
  if (cached) return cached;

  // Buscar en todas las categorías
  for (const domain of SKILL_DOMAINS) {
    const skillPath = path.join(SKILLS_BASE_DIR, domain, skillName, 'SKILL.md');

    try {
      await fs.access(skillPath);
      const raw = await fs.readFile(skillPath, 'utf-8');
      const skillDef = parseSkillDefinition(raw, skillName, domain, skillPath);

      // Guardar en cache
      setCachedSkill(skillName, skillDef);

      console.log(`[SkillExecutor] Loaded skill: ${skillName} from ${domain}`);
      return skillDef;
    } catch (err) {
      // Archivo no existe en esta categoría, continuar buscando
      continue;
    }
  }

  console.log(`[SkillExecutor] Skill not found: ${skillName}`);
  return null;
}

/**
 * Parsea frontmatter YAML y contenido markdown del skill
 * @param {string} markdown - Contenido completo del SKILL.md
 * @param {string} skillName - Nombre del skill
 * @param {string} domain - Dominio del skill (ej: 'data')
 * @param {string} filePath - Ruta completa del archivo
 * @returns {object} - Skill definition parseada
 */
function parseSkillDefinition(markdown, skillName, domain, filePath) {
  const parsed = matter(markdown);

  return {
    name: parsed.data.name || skillName,
    description: parsed.data.description || '',
    agent: parsed.data.agent || 'Transversal',
    model: parsed.data.model || 'sonnet', // haiku | sonnet | opus
    disableModelInvocation: parsed.data['disable-model-invocation'] || false,
    allowedTools: parsed.data['allowed-tools'] || [],
    argumentHint: parsed.data['argument-hint'] || '',
    tools: parsed.data.tools || [],
    inputs: parsed.data.inputs || [],
    outputs: parsed.data.outputs || {},
    content: parsed.content, // Full markdown instructions
    domain,
    filePath,
  };
}

// ─── Prompt Construction ─────────────────────────────────────────────────────

/**
 * Construye system prompt completo para ejecutar el skill
 * @param {string} agentId - ID del agente activo
 * @param {object} skillDef - Skill definition parseada
 * @param {string} args - Argumentos del usuario
 * @returns {Promise<string>} - System prompt completo
 */
export async function buildSkillPrompt(agentId, skillDef, args) {
  const sections = [];

  // 1. Contexto del agente (system prompt base + memoria + eventos)
  const agentContext = await buildAgentContext(agentId, { channel: 'telegram' });
  sections.push(agentContext.systemPrompt);

  // 2. Skill-specific instructions
  sections.push('\n# SKILL EXECUTION MODE\n');
  sections.push(`Skill: ${skillDef.name}`);
  sections.push(`Domain: ${skillDef.domain}`);
  sections.push(`Description: ${skillDef.description}`);
  sections.push('');
  sections.push('# SKILL INSTRUCTIONS\n');

  // 3. Dynamic context injection (!`command`)
  let contentWithContext = skillDef.content;
  if (skillDef.content.includes('!`')) {
    contentWithContext = await injectDynamicContext(skillDef.content);
  }

  // 4. Argument substitution ($ARGUMENTS, $1, $2, $3)
  let finalContent = contentWithContext;
  if (args) {
    finalContent = substituteArguments(contentWithContext, args);
  }

  sections.push(finalContent);
  sections.push('');

  // 5. User input section
  if (args) {
    sections.push('# USER INPUT\n');
    sections.push(`Arguments: ${args}`);
    sections.push('');
  }

  // 6. Telegram constraints (reforzar las del agent context)
  sections.push('# OUTPUT CONSTRAINTS\n');
  sections.push('- Response MUST be under 800 characters if possible');
  sections.push('- Use bullet points for clarity');
  sections.push('- NO code blocks longer than 20 lines');
  sections.push('- Split long responses into logical sections');

  return sections.join('\n');
}

/**
 * Ejecuta comandos dinámicos en el contenido del skill (!`command`)
 * @param {string} content - Contenido markdown del skill
 * @returns {Promise<string>} - Contenido con comandos ejecutados
 */
async function injectDynamicContext(content) {
  const pattern = /!\`([^`]+)\`/g;
  let result = content;
  const matches = Array.from(content.matchAll(pattern));

  // Whitelist of allowed commands (ONLY read-only operations)
  // Feature 11: Security & Auth - prevent RCE via command injection
  const ALLOWED_COMMANDS = [
    /^ls\s/,
    /^ls$/,
    /^cat\s/,
    /^grep\s/,
    /^find\s/,
    /^node\s+tools\/db\/.*\.js\s+list/,  // Only list queries, no mutations
    /^git\s+status/,
    /^git\s+log/,
    /^git\s+branch/,
    /^git\s+diff/,
  ];

  for (const match of matches) {
    const command = match[1];

    // Validate command is in whitelist
    const isAllowed = ALLOWED_COMMANDS.some(pattern => pattern.test(command));

    if (!isAllowed) {
      console.error(`[SkillExecutor] BLOCKED dangerous command: ${command}`);
      result = result.replace(match[0], '[Error: Command not allowed]');
      continue;
    }

    try {
      const { stdout } = await execAsync(command, {
        cwd: process.cwd(),
        timeout: 10000, // 10s max per command
      });
      result = result.replace(match[0], stdout.trim());
      console.log(`[SkillExecutor] Dynamic context injection: ${command.substring(0, 50)}... ✓`);
    } catch (err) {
      console.error(`[SkillExecutor] Dynamic context injection failed: ${command}`, err.message);
      result = result.replace(match[0], `[Error: ${err.message}]`);
    }
  }

  return result;
}

/**
 * Sustituye placeholders de argumentos en el contenido del skill
 * @param {string} content - Contenido markdown del skill
 * @param {string} args - Argumentos del usuario
 * @returns {string} - Contenido con argumentos sustituidos
 */
function substituteArguments(content, args) {
  const argArray = args.trim().split(/\s+/);

  return content
    .replace(/\$ARGUMENTS/g, args)
    .replace(/\$1/g, argArray[0] || '')
    .replace(/\$2/g, argArray[1] || '')
    .replace(/\$3/g, argArray[2] || '');
}

// ─── Claude API Invocation ───────────────────────────────────────────────────

/**
 * Selecciona modelo de Claude API según skill/agent preference
 * @param {object} skillDef - Skill definition
 * @param {object} agentDef - Agent definition
 * @returns {string} - Model ID completo
 */
function selectModel(skillDef, agentDef) {
  const modelMap = {
    'haiku': 'claude-3-5-haiku-20241022',
    'sonnet': 'claude-sonnet-4-6',
    'opus': 'claude-opus-4-20250514',
  };

  const modelKey = skillDef.model || agentDef?.frontmatter?.model || 'sonnet';
  return modelMap[modelKey] || modelMap['sonnet'];
}

/**
 * Obtiene max tokens según modelo
 * @param {string} modelKey - haiku | sonnet | opus
 * @returns {number} - Max tokens
 */
function getMaxTokens(modelKey) {
  const tokenLimits = {
    'haiku': 512,
    'sonnet': 1024,
    'opus': 2048,
  };
  return tokenLimits[modelKey] || 1024;
}

/**
 * Invoca Claude API con streaming y actualización progresiva en Telegram
 * @param {object} ctx - Telegraf context
 * @param {string} systemPrompt - System prompt completo
 * @param {string} args - Argumentos del usuario
 * @param {object} skillDef - Skill definition
 * @param {object} agentDef - Agent definition
 * @returns {Promise<object>} - { success, message }
 */
async function invokeSkillWithStreaming(ctx, systemPrompt, args, skillDef, agentDef) {
  const thinkingMsg = await ctx.reply('⚡ Ejecutando skill...');
  const chatId = ctx.chat.id;
  const msgId = thinkingMsg.message_id;

  try {
    const model = selectModel(skillDef, agentDef);
    const maxTokens = getMaxTokens(skillDef.model);

    console.log(`[SkillExecutor] Invoking Claude API: model=${model}, maxTokens=${maxTokens}`);

    const stream = await anthropic.messages.stream({
      model,
      max_tokens: maxTokens,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{ role: 'user', content: args || 'Execute this skill' }],
    });

    let accumulated = '';
    let lastEditAt = 0;

    stream.on('text', (chunk) => {
      accumulated += chunk;
      const now = Date.now();

      if (now - lastEditAt > EDIT_INTERVAL_MS && accumulated.length > 30) {
        lastEditAt = now;
        ctx.telegram.editMessageText(
          chatId, msgId, undefined,
          accumulated.substring(0, 4000) + ' ...',
        ).catch(() => {}); // Ignore Telegram rate limits
      }
    });

    await stream.finalMessage();

    // Delete streaming message
    await ctx.telegram.deleteMessage(chatId, msgId).catch(() => {});

    console.log(`[SkillExecutor] Claude API response complete: ${accumulated.length} chars`);

    return { success: true, message: accumulated, model };

  } catch (error) {
    await ctx.telegram.deleteMessage(chatId, msgId).catch(() => {});
    throw error;
  }
}

// ─── Helper: Chunked Reply ───────────────────────────────────────────────────

/**
 * Divide texto en chunks respetando párrafos y envía como mensajes separados
 * (Reutiliza lógica de bot.js)
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

async function replyChunked(ctx, text, extra = {}) {
  const chunks = chunkText(text, 900);
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

// ─── Special Case: disable-model-invocation ──────────────────────────────────

/**
 * Ejecuta tool directamente sin invocar Claude API
 * @param {object} skillDef - Skill definition
 * @param {string} args - Argumentos del usuario
 * @returns {Promise<object>} - { success, message }
 */
async function executeToolDirectly(skillDef, args) {
  if (!skillDef.tools || skillDef.tools.length === 0) {
    throw new Error(`Skill ${skillDef.name} has disable-model-invocation but no tools defined`);
  }

  const toolPath = skillDef.tools[0]; // Usar el primer tool
  console.log(`[SkillExecutor] Executing tool directly: ${toolPath}`);

  try {
    const command = `node ${toolPath} "${args || ''}"`;
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      timeout: 30000, // 30s max
    });

    if (stderr) {
      console.warn(`[SkillExecutor] Tool stderr: ${stderr}`);
    }

    return { success: true, message: stdout.trim() };

  } catch (err) {
    console.error(`[SkillExecutor] Tool execution failed:`, err.message);
    throw new Error(`Tool execution failed: ${err.message}`);
  }
}

// ─── Permission Validation ───────────────────────────────────────────────────

/**
 * Valida que el agente activo tiene permiso para ejecutar el skill
 * @param {string} agentId - ID del agente activo
 * @param {object} skillDef - Skill definition
 * @returns {object} - { allowed: boolean, message?: string }
 */
function validateAgentAccess(agentId, skillDef) {
  if (skillDef.agent && skillDef.agent !== 'Transversal') {
    // Convertir "Data Agent" → "data-agent"
    const expectedAgentId = skillDef.agent.toLowerCase().replace(/\s+/g, '-') + '-agent';

    if (agentId !== expectedAgentId) {
      return {
        allowed: false,
        message: `❌ Este skill requiere **${skillDef.agent}**.\n\nUsa \`/agent ${expectedAgentId}\` para cambiar.`,
      };
    }
  }

  return { allowed: true };
}

// ─── Logging & Memory ────────────────────────────────────────────────────────

/**
 * Registra ejecución del skill en raw_events usando event-logger centralizado
 * @param {string} agentId - ID del agente
 * @param {string} skillName - Nombre del skill
 * @param {string} domain - Dominio del skill
 * @param {string} args - Argumentos
 * @param {object} result - Resultado de la ejecución
 * @param {number} duration - Duración en ms
 * @param {string} status - 'completed' | 'failed' | 'timeout'
 */
async function logSkillExecution(agentId, skillName, domain, args, result, duration, status) {
  await logEvent(agentId, EVENT_TYPES.SKILL_INVOCATION, {
    skill_name: skillName,
    domain,
    status,
    duration_ms: duration,
    args,
    triggered_by: 'telegram',
    result_preview: typeof result === 'string' ? result.substring(0, 200) : undefined
  });
  console.log(`[SkillExecutor] Logged skill execution: ${skillName} (${status}, ${duration}ms)`);
}

// ─── Main Execution Function ─────────────────────────────────────────────────

/**
 * Ejecuta un skill desde Telegram
 * @param {object} ctx - Telegraf context
 * @param {string} skillName - Nombre del skill (ej: 'consultas-sql')
 * @param {string} args - Argumentos del usuario
 * @returns {Promise<object>} - { success: boolean, message: string }
 */
export async function executeSkill(ctx, skillName, args) {
  const startTime = Date.now();

  // Sanitize inputs to prevent injection attacks
  const sanitizedSkillName = sanitizeInput(skillName);
  const sanitizedArgs = sanitizeInput(args);

  try {
    // 1. Load skill definition
    const skillDef = await getSkillDefinition(sanitizedSkillName);
    if (!skillDef) {
      return {
        success: false,
        message: `❌ Skill '${skillName}' no encontrado.\n\nUsa /whoami para ver skills disponibles del agente activo.`
      };
    }

    // 2. Get active agent
    const agentId = await getCurrentAgent(ctx);

    // 3. Validate agent access
    const validation = validateAgentAccess(agentId, skillDef);
    if (!validation.allowed) {
      return { success: false, message: validation.message };
    }

    // 4. Handle disable-model-invocation case
    if (skillDef.disableModelInvocation) {
      console.log(`[SkillExecutor] Skill ${sanitizedSkillName} has disable-model-invocation=true, executing tool directly`);

      const result = await executeToolDirectly(skillDef, sanitizedArgs);
      await replyChunked(ctx, result.message);

      const duration = Date.now() - startTime;
      await logSkillExecution(agentId, sanitizedSkillName, skillDef.domain, sanitizedArgs, result, duration, 'completed');

      return result;
    }

    // 5. Build skill prompt
    const systemPrompt = await buildSkillPrompt(agentId, skillDef, sanitizedArgs);

    // 6. Get agent definition for model selection
    const agentContext = await buildAgentContext(agentId, { channel: 'telegram' });

    // 7. Invoke Claude API with streaming
    const result = await invokeSkillWithStreaming(ctx, systemPrompt, sanitizedArgs, skillDef, agentContext.agentDef);

    // 8. Send chunked response
    await replyChunked(ctx, result.message);

    // 9. Log execution
    const duration = Date.now() - startTime;
    await logSkillExecution(agentId, sanitizedSkillName, skillDef.domain, sanitizedArgs, result, duration, 'completed');

    return result;

  } catch (error) {
    const duration = Date.now() - startTime;
    await logSkillExecution(agentId, sanitizedSkillName, skillDef?.domain || 'unknown', sanitizedArgs, null, duration, 'failed');

    console.error('[SkillExecutor] Execution error:', error);
    throw error;
  }
}
