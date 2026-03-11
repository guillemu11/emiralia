/**
 * Emiralia — PM Agent Context Builder
 *
 * Builds a rich project context for the PM Agent by reading:
 * 1. CLAUDE.md (project bible)
 * 2. Agent definitions (.claude/agents/)
 * 3. Workflows (.claude/workflows/)
 * 4. Live DB state (agents, projects, shared memory)
 *
 * Used by both the Dashboard API and the Telegram bot.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

dotenv.config({ path: path.resolve(ROOT, '.env') });

// ─── Read project files ─────────────────────────────────────────────────────

async function readFileSafe(filePath) {
    try {
        return await fs.readFile(filePath, 'utf-8');
    } catch {
        return null;
    }
}

async function readDirMarkdown(dirPath) {
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true, recursive: true });
        const results = [];
        for (const entry of entries) {
            if (entry.isFile() && entry.name.endsWith('.md')) {
                const fullPath = path.join(entry.parentPath || entry.path, entry.name);
                const content = await readFileSafe(fullPath);
                if (content) {
                    const relativePath = path.relative(ROOT, fullPath).replace(/\\/g, '/');
                    results.push({ path: relativePath, content });
                }
            }
        }
        return results;
    } catch {
        return [];
    }
}

// ─── Build static context (from files — cached) ────────────────────────────

let staticContextCache = null;
let cacheCreatedAt = null;

async function buildStaticContext() {
    if (staticContextCache) return staticContextCache;

    let context = '';

    // 1. CLAUDE.md — the project bible
    const claudeMd = await readFileSafe(path.join(ROOT, '.claude', 'CLAUDE.md'));
    if (claudeMd) {
        context += '\n\n## Documentación del Proyecto (CLAUDE.md)\n\n';
        context += claudeMd;
    }

    // 2. Brand guidelines
    const brand = await readFileSafe(path.join(ROOT, '.claude', 'rules', 'brand-guidelines.md'));
    if (brand) {
        context += '\n\n## Brand Guidelines\n\n';
        context += brand;
    }

    // 3. Agent definitions
    const agents = await readDirMarkdown(path.join(ROOT, '.claude', 'agents'));
    if (agents.length > 0) {
        context += '\n\n## Definiciones de Agentes\n\n';
        for (const a of agents) {
            // Skip own definition to avoid recursion
            if (a.path.includes('pm-agent.md')) continue;
            context += `### ${a.path}\n\n${a.content}\n\n---\n\n`;
        }
    }

    // 4. Workflows
    const workflows = await readDirMarkdown(path.join(ROOT, '.claude', 'workflows'));
    if (workflows.length > 0) {
        context += '\n\n## Workflows Disponibles\n\n';
        for (const w of workflows) {
            context += `### ${w.path}\n\n${w.content}\n\n---\n\n`;
        }
    }

    // 5. Tools inventory (just list file names, not full content)
    try {
        const toolFiles = await fs.readdir(path.join(ROOT, 'tools'), { withFileTypes: true, recursive: true });
        const toolPaths = toolFiles
            .filter(e => e.isFile() && e.name.endsWith('.js'))
            .map(e => path.relative(ROOT, path.join(e.parentPath || e.path, e.name)).replace(/\\/g, '/'));

        if (toolPaths.length > 0) {
            context += '\n\n## Tools Disponibles\n\n';
            context += toolPaths.map(t => `- \`${t}\``).join('\n');
            context += '\n';
        }
    } catch { /* ignore */ }

    staticContextCache = context;
    cacheCreatedAt = Date.now();
    return context;
}

// ─── Build live context (from DB — fresh every call) ────────────────────────

async function buildLiveContext(pool) {
    if (!pool) return '';

    try {
        const [agentsRes, projectsRes, memoryRes] = await Promise.all([
            pool.query('SELECT id, name, role, department, status FROM agents ORDER BY department, id'),
            pool.query('SELECT id, name, status, department FROM projects ORDER BY created_at DESC LIMIT 10'),
            pool.query("SELECT agent_id, key, value FROM agent_memory WHERE scope = 'shared' ORDER BY updated_at DESC LIMIT 20"),
        ]);

        let context = '\n\n## Estado Live del Sistema (DB)\n';

        // Agents
        context += '\n### Agentes registrados en DB\n';
        if (agentsRes.rows.length > 0) {
            context += '| ID | Nombre | Rol | Depto | Estado |\n|---|---|---|---|---|\n';
            for (const a of agentsRes.rows) {
                context += `| ${a.id} | ${a.name} | ${a.role} | ${a.department} | ${a.status || 'active'} |\n`;
            }
        } else {
            context += 'No hay agentes registrados aún.\n';
        }

        // Projects
        context += '\n### Proyectos recientes\n';
        if (projectsRes.rows.length > 0) {
            context += '| ID | Nombre | Estado | Depto |\n|---|---|---|---|\n';
            for (const p of projectsRes.rows) {
                context += `| ${p.id} | ${p.name} | ${p.status} | ${p.department} |\n`;
            }
        } else {
            context += 'No hay proyectos creados aún.\n';
        }

        // Shared memory
        if (memoryRes.rows.length > 0) {
            context += '\n### Estado compartido de agentes (WAT Memory)\n';
            for (const m of memoryRes.rows) {
                const val = typeof m.value === 'string' ? m.value : JSON.stringify(m.value);
                context += `- **${m.agent_id}** → ${m.key}: ${val.substring(0, 200)}\n`;
            }
        }

        return context;
    } catch (err) {
        console.error('Error building live context:', err.message);
        return '';
    }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Build full project context for the PM Agent.
 * @param {Object} [pool] - PostgreSQL pool for live DB queries (optional)
 * @returns {Promise<string>} Context string to append to system prompt
 */
export async function buildProjectContext(pool) {
    const [staticCtx, liveCtx] = await Promise.all([
        buildStaticContext(),
        buildLiveContext(pool),
    ]);

    return staticCtx + liveCtx;
}

/**
 * Build a lightweight context for Telegram (mobile-first).
 * Skips CLAUDE.md, agent definitions, brand guidelines, and workflows.
 * Returns only: tools list + live DB state.
 *
 * @param {Object} [pool] - PostgreSQL pool for live DB queries (optional)
 * @returns {Promise<string>} Lightweight context string
 */
export async function buildLightContext(pool) {
    let context = '';

    // Tools inventory only (file names, not content)
    try {
        const toolFiles = await fs.readdir(path.join(ROOT, 'tools'), { withFileTypes: true, recursive: true });
        const toolPaths = toolFiles
            .filter(e => e.isFile() && e.name.endsWith('.js'))
            .map(e => path.relative(ROOT, path.join(e.parentPath || e.path, e.name)).replace(/\\/g, '/'));

        if (toolPaths.length > 0) {
            context += '\n\n## Tools Disponibles\n\n';
            context += toolPaths.map(t => `- \`${t}\``).join('\n');
            context += '\n';
        }
    } catch { /* ignore */ }

    // Live DB state (same as buildLiveContext)
    context += await buildLiveContext(pool);

    return context;
}

/**
 * Clear the cached static context (useful if project files changed).
 */
export function clearContextCache() {
    staticContextCache = null;
    cacheCreatedAt = null;
}

/**
 * Get the age of the static context cache in milliseconds.
 * @returns {number|null} Cache age in ms, or null if no cache exists
 */
export function getCacheAge() {
    return cacheCreatedAt ? Date.now() - cacheCreatedAt : null;
}

/**
 * Get stats about the current context state.
 * @returns {{ staticCached: boolean, cacheAgeMs: number|null, liveQueryLimits: { projects: number, memory: number } }}
 */
export function getContextStats() {
    return {
        staticCached: staticContextCache !== null,
        cacheAgeMs: getCacheAge(),
        liveQueryLimits: { projects: 10, memory: 20 },
    };
}
