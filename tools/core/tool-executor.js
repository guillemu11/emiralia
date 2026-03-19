/**
 * Emiralia — Tool Execution Engine (Core Infrastructure)
 *
 * Ejecuta tools de forma segura con:
 *   - Permission validation
 *   - Timeout enforcement
 *   - Event logging
 *   - Error handling
 *
 * Usage:
 *   import { executeToolForAgent } from './tools/core/tool-executor.js';
 *   const result = await executeToolForAgent('data-agent', 'query.properties', ['SELECT * FROM properties LIMIT 10']);
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from '../db/pool.js';
import { logEvent, EVENT_TYPES } from './event-logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let toolRegistry = null;
let toolCache = new Map(); // Cache imported tool functions

/**
 * Load tool registry (lazy loaded, cached)
 */
async function loadRegistry() {
  if (toolRegistry) return toolRegistry;

  const registryPath = join(__dirname, 'tool-registry.json');
  const data = await readFile(registryPath, 'utf-8');
  toolRegistry = JSON.parse(data);

  return toolRegistry;
}

/**
 * Get tool definition from registry
 */
async function getToolDef(toolName) {
  const registry = await loadRegistry();
  const tool = registry.tools[toolName];

  if (!tool) {
    throw new Error(`Tool '${toolName}' not found in registry`);
  }

  return tool;
}

/**
 * Import and cache tool function
 */
async function importTool(toolDef) {
  const cacheKey = `${toolDef.path}#${toolDef.export}`;

  if (toolCache.has(cacheKey)) {
    return toolCache.get(cacheKey);
  }

  // Dynamic import (convert to file:// URL for Windows compatibility)
  const modulePath = join(__dirname, toolDef.path);
  const moduleUrl = new URL(`file:///${modulePath.replace(/\\/g, '/')}`).href;
  const module = await import(moduleUrl);
  const fn = module[toolDef.export];

  if (!fn || typeof fn !== 'function') {
    throw new Error(`Export '${toolDef.export}' not found or not a function in ${toolDef.path}`);
  }

  toolCache.set(cacheKey, fn);
  return fn;
}

/**
 * Check if agent has permission to use tool
 */
async function checkPermission(agentId, toolDef) {
  // Wildcard permission: all agents can use
  if (toolDef.permissions === '*') {
    return true;
  }

  // Check if agentId is in allowed list
  if (Array.isArray(toolDef.permissions)) {
    return toolDef.permissions.includes(agentId);
  }

  return false;
}

/**
 * Execute function with timeout
 */
async function executeWithTimeout(fn, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Tool execution timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    fn(...args)
      .then(result => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Log tool execution event to raw_events (uses centralized event-logger)
 */
async function logToolExecution(agentId, toolName, status, metadata = {}) {
  await logEvent(agentId, EVENT_TYPES.TOOL_EXECUTION, {
    tool_name: toolName,
    status, // 'started', 'completed', 'failed', 'timeout'
    ...metadata
  });
}

/**
 * Main execution function
 *
 * @param {string} agentId - ID of the agent executing the tool
 * @param {string} toolName - Tool name from registry (e.g., 'memory.set')
 * @param {Array} args - Arguments to pass to the tool function
 * @param {Object} options - Execution options
 * @param {number} options.timeout - Override default timeout
 * @param {boolean} options.logEvents - Whether to log to raw_events (default: true)
 * @returns {Promise<any>} Tool execution result
 */
export async function executeToolForAgent(agentId, toolName, args = [], options = {}) {
  const startTime = Date.now();

  // Load tool definition
  const toolDef = await getToolDef(toolName);

  // Check permissions
  const hasPermission = await checkPermission(agentId, toolDef);
  if (!hasPermission) {
    const error = new Error(`Agent '${agentId}' does not have permission to use tool '${toolName}'`);
    error.code = 'PERMISSION_DENIED';
    throw error;
  }

  // Import tool function
  const toolFn = await importTool(toolDef);

  // Determine timeout
  const timeout = options.timeout || toolDef.timeout || 30000;

  // Log start
  if (options.logEvents !== false) {
    await logToolExecution(agentId, toolName, 'started', {
      args: args.slice(0, 3), // Only log first 3 args to avoid bloat
      timeout
    });
  }

  try {
    // Execute with timeout
    const result = await executeWithTimeout(toolFn, args, timeout);

    const duration = Date.now() - startTime;

    // Log success
    if (options.logEvents !== false) {
      await logToolExecution(agentId, toolName, 'completed', {
        duration_ms: duration,
        result_type: typeof result,
        result_length: Array.isArray(result) ? result.length : undefined
      });
    }

    return result;

  } catch (error) {
    const duration = Date.now() - startTime;

    // Determine error type
    const status = error.message.includes('timeout') ? 'timeout' : 'failed';

    // Log error
    if (options.logEvents !== false) {
      await logToolExecution(agentId, toolName, status, {
        duration_ms: duration,
        error: error.message,
        error_code: error.code
      });
    }

    // Re-throw with enhanced context
    error.toolName = toolName;
    error.agentId = agentId;
    error.duration = duration;
    throw error;
  }
}

/**
 * Get list of available tools for an agent
 */
export async function getAvailableTools(agentId) {
  const registry = await loadRegistry();
  const available = [];

  for (const [toolName, toolDef] of Object.entries(registry.tools)) {
    const hasPermission = await checkPermission(agentId, toolDef);
    if (hasPermission) {
      available.push({
        name: toolName,
        description: toolDef.description,
        category: toolDef.category,
        timeout: toolDef.timeout,
        args: toolDef.args
      });
    }
  }

  return available;
}

/**
 * Get tool metadata
 */
export async function getToolMetadata(toolName) {
  const toolDef = await getToolDef(toolName);
  return {
    name: toolName,
    description: toolDef.description,
    category: toolDef.category,
    timeout: toolDef.timeout,
    args: toolDef.args,
    permissions: toolDef.permissions
  };
}

/**
 * Clear tool cache (useful for testing or hot-reload)
 */
export function clearToolCache() {
  toolCache.clear();
  toolRegistry = null;
}
