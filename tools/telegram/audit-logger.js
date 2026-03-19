/**
 * Audit Logger for CRUD Operations
 *
 * Wrapper around event-logger.js for CRUD-specific logging.
 * Maintains backward compatibility with existing code.
 */

import { logEvent, EVENT_TYPES, getEvents } from '../core/event-logger.js';

/**
 * Log CRUD operation to raw_events
 * @param {object} params - Log parameters
 * @param {string} params.userId - Telegram user ID
 * @param {string} params.agentId - Active agent ID
 * @param {string} params.operation - CRUD operation (create/read/update/delete/list)
 * @param {string} params.resourceType - Resource type
 * @param {string|null} params.resourceId - Resource ID (null for create/list)
 * @param {object} params.data - Data payload (for create/update)
 * @param {boolean} params.success - Whether operation succeeded
 * @param {string|null} params.error - Error message if failed
 */
export async function logCRUDOperation({
  userId,
  agentId,
  operation,
  resourceType,
  resourceId = null,
  data = {},
  success = true,
  error = null
}) {
  const eventContent = {
    user_id: userId,
    operation: operation.toUpperCase(),
    resource_type: resourceType,
    resource_id: resourceId,
    data, // Will be sanitized by event-logger
    success,
    error,
    channel: 'telegram',
  };

  const eventId = await logEvent(agentId, EVENT_TYPES.CRUD_OPERATION, eventContent);

  if (eventId) {
    console.log(`[AUDIT] ${userId} ${operation} ${resourceType} #${resourceId || 'N/A'} - ${success ? 'SUCCESS' : 'FAILED'}`);
  }

  return eventId;
}

/**
 * Get CRUD operation stats
 * @param {string} agentId - Agent ID
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} Stats array
 */
export async function getCRUDStats(agentId, days = 7) {
  const events = await getEvents(agentId, {
    eventType: EVENT_TYPES.CRUD_OPERATION,
    startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
    limit: 1000,
  });

  // Aggregate stats
  const stats = {};

  for (const event of events) {
    const op = event.content.operation;
    const type = event.content.resource_type;
    const key = `${op}-${type}`;

    if (!stats[key]) {
      stats[key] = {
        operation: op,
        resource_type: type,
        count: 0,
        success_count: 0,
      };
    }

    stats[key].count++;
    if (event.content.success) {
      stats[key].success_count++;
    }
  }

  return Object.values(stats).sort((a, b) => b.count - a.count);
}
