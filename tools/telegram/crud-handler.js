/**
 * CRUD Handler - Main Orchestrator
 *
 * Handles all CRUD operations from Telegram commands.
 * Orchestrates permissions, parsing, adapters, and formatting.
 */

import { parseArguments, validateData, validateFilters } from './crud-parsers.js';
import { checkPermission, validateScope } from './crud-permissions.js';
import { formatResponse, formatError } from './crud-formatters.js';
import { logCRUDOperation } from './audit-logger.js';
import { getAdapter } from './adapters/index.js';
import { getUser, getActiveAgent } from '../db/telegram_user_queries.js';
import { sanitizeInput } from './input-sanitizer.js';

/**
 * Handle CRUD operation
 * @param {string} operation - CRUD operation (create/read/update/delete/list)
 * @param {string|null} agentId - Active agent ID (optional, will be fetched from session)
 * @param {string} commandText - Command text without the /command part
 * @param {object} ctx - Telegraf context
 */
export async function handleCRUD(operation, agentId, commandText, ctx) {
  const userId = ctx.from.id;

  // Sanitize input to prevent injection attacks
  const sanitizedCommandText = sanitizeInput(commandText);

  try {
    // 1. Parse arguments
    const { resourceType, resourceId, data, filters } = parseArguments(`${operation} ${sanitizedCommandText}`);

    console.log(`[CRUD] ${operation} ${resourceType} #${resourceId || 'N/A'} by user ${userId}`);

    // 2. Get active agent (if not specified)
    if (!agentId) {
      agentId = await getActiveAgent(userId);
      if (!agentId) {
        await ctx.reply('❌ No active agent. Use /agents to select an agent first.');
        return;
      }
    }

    // 3. Check permissions
    const hasPermission = await checkPermission(userId, agentId, resourceType, operation);
    if (!hasPermission) {
      await ctx.reply(`❌ Permission denied: ${agentId} cannot ${operation} ${resourceType}`);
      await logCRUDOperation({
        userId,
        agentId,
        operation,
        resourceType,
        resourceId,
        data,
        success: false,
        error: 'Permission denied'
      });
      return;
    }

    // 4. Validate data (for create/update)
    if (['create', 'update'].includes(operation)) {
      try {
        validateData(resourceType, operation, data);
      } catch (validationError) {
        await ctx.reply(`❌ Validation error: ${validationError.message}`);
        await logCRUDOperation({
          userId,
          agentId,
          operation,
          resourceType,
          resourceId,
          data,
          success: false,
          error: validationError.message
        });
        return;
      }
    }

    // 5. Validate filters (for list)
    if (operation === 'list') {
      try {
        validateFilters(resourceType, filters);
      } catch (validationError) {
        await ctx.reply(`❌ Invalid filters: ${validationError.message}`);
        return;
      }
    }

    // 6. Get adapter
    const adapter = getAdapter(resourceType);
    if (!adapter) {
      throw new Error(`No adapter found for resource type: ${resourceType}`);
    }

    // 7. For update/delete, validate scope (ownership)
    if (['update', 'delete'].includes(operation) && resourceId) {
      const user = await getUser(userId);

      // First read the resource to check ownership
      const resource = await adapter.read(resourceId);
      if (!resource) {
        await ctx.reply(`❌ ${resourceType} #${resourceId} not found`);
        return;
      }

      const hasScope = validateScope(userId, user.role, resourceType, resource);
      if (!hasScope) {
        await ctx.reply(`❌ Access denied: you can only ${operation} your own ${resourceType}`);
        await logCRUDOperation({
          userId,
          agentId,
          operation,
          resourceType,
          resourceId,
          data,
          success: false,
          error: 'Scope denied'
        });
        return;
      }
    }

    // 8. Execute operation
    let result;
    switch (operation) {
      case 'create':
        result = await adapter.create(data, userId);
        break;

      case 'read':
        if (!resourceId) {
          throw new Error('Resource ID required for read operation');
        }
        // Special case for agent_memory: needs agentId
        if (resourceType === 'agent_memory') {
          result = await adapter.read(resourceId, agentId);
        } else {
          result = await adapter.read(resourceId);
        }
        break;

      case 'update':
        if (!resourceId) {
          throw new Error('Resource ID required for update operation');
        }
        // Special case for agent_memory: needs agentId
        if (resourceType === 'agent_memory') {
          result = await adapter.update(resourceId, data, agentId);
        } else {
          result = await adapter.update(resourceId, data);
        }
        break;

      case 'delete':
        if (!resourceId) {
          throw new Error('Resource ID required for delete operation');
        }
        // Special case for agent_memory: needs agentId
        if (resourceType === 'agent_memory') {
          result = await adapter.delete(resourceId, agentId);
        } else {
          result = await adapter.delete(resourceId);
        }
        break;

      case 'list':
        // For agent_memory, inject agentId into filters if not specified
        if (resourceType === 'agent_memory' && !filters.agent_id) {
          filters.agent_id = agentId;
        }
        result = await adapter.list(filters);
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    // 9. Log audit trail (success)
    await logCRUDOperation({
      userId,
      agentId,
      operation,
      resourceType,
      resourceId: resourceId || (result && result.id) || null,
      data,
      success: true,
      error: null
    });

    // 10. Format response
    const response = formatResponse(operation, resourceType, result);
    await ctx.reply(response, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('CRUD error:', error);

    // Format error message
    const errorMsg = formatError(operation, commandText.split(' ')[0], error);
    await ctx.reply(errorMsg, { parse_mode: 'Markdown' });

    // Log failed operation
    await logCRUDOperation({
      userId,
      agentId: agentId || 'unknown',
      operation,
      resourceType: commandText.split(' ')[0] || 'unknown',
      resourceId: null,
      data: {},
      success: false,
      error: error.message
    });
  }
}

export default handleCRUD;
