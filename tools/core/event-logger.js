/**
 * Emiralia — Unified Event Logger
 *
 * Centralizes all event logging to raw_events table.
 * Non-blocking: never throws, logs errors to console only.
 *
 * Usage:
 *   import { logEvent, EVENT_TYPES } from './tools/core/event-logger.js';
 *   await logEvent('data-agent', EVENT_TYPES.TOOL_EXECUTION, {
 *     tool: 'scrape',
 *     status: 'completed'
 *   });
 */

import pool from '../db/pool.js';

/**
 * Event types registry (for documentation and validation)
 */
export const EVENT_TYPES = {
  TOOL_EXECUTION: 'tool_execution',
  SKILL_INVOCATION: 'skill_invocation',
  CRUD_OPERATION: 'crud_operation',
  MESSAGE_SENT: 'message_sent',
  ERROR: 'error',
  AGENT_SWITCH: 'agent_switch',
  CONVERSATION_LOADED: 'conversation_loaded',
  CONVERSATION_CLEARED: 'conversation_cleared',
};

/**
 * Sanitize data before logging (remove sensitive fields, truncate large values)
 * @param {object} data - Data object to sanitize
 * @returns {object} Sanitized data
 */
function sanitizeData(data) {
  if (!data || typeof data !== 'object') return data;

  const sanitized = { ...data };

  // Remove sensitive fields
  const SENSITIVE_FIELDS = ['password', 'token', 'api_key', 'secret', 'apiKey', 'authorization'];

  for (const field of SENSITIVE_FIELDS) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  // Truncate large string values
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string' && value.length > 1000) {
      sanitized[key] = value.substring(0, 1000) + '... (truncated)';
    }

    // Recursively sanitize nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeData(value);
    }
  }

  return sanitized;
}

/**
 * Log an event to raw_events table
 *
 * @param {string} agentId - Agent ID (e.g., 'data-agent')
 * @param {string} eventType - Event type (use EVENT_TYPES constants)
 * @param {object} content - Event content (will be stored as JSONB)
 * @param {object} options - Logging options
 * @param {boolean} options.sanitize - Whether to sanitize sensitive data (default: true)
 * @param {boolean} options.addTimestamp - Whether to add timestamp to content (default: true)
 * @returns {Promise<number|null>} Event ID if successful, null if failed
 */
export async function logEvent(agentId, eventType, content, options = {}) {
  const { sanitize = true, addTimestamp = true } = options;

  try {
    // Prepare content
    let finalContent = sanitize ? sanitizeData(content) : content;

    if (addTimestamp && !finalContent.timestamp) {
      finalContent = {
        ...finalContent,
        timestamp: new Date().toISOString(),
      };
    }

    // Insert event
    const result = await pool.query(`
      INSERT INTO raw_events (agent_id, event_type, content)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [agentId, eventType, JSON.stringify(finalContent)]);

    const eventId = result.rows[0].id;
    console.log(`[EventLogger] Logged ${eventType} for ${agentId} (ID: ${eventId})`);

    return eventId;

  } catch (err) {
    // Non-blocking: log error but don't throw
    console.error('[EventLogger] Failed to log event (non-blocking):', {
      agentId,
      eventType,
      error: err.message,
      stack: err.stack,
    });
    return null;
  }
}

/**
 * Get events for an agent within a time range
 *
 * @param {string} agentId - Agent ID
 * @param {object} filters - Query filters
 * @param {string} filters.eventType - Filter by event type
 * @param {Date} filters.startDate - Start date
 * @param {Date} filters.endDate - End date
 * @param {number} filters.limit - Max results (default: 100)
 * @returns {Promise<Array>} Array of events
 */
export async function getEvents(agentId, filters = {}) {
  const { eventType, startDate, endDate, limit = 100 } = filters;

  try {
    let query = `
      SELECT id, agent_id, event_type, content, timestamp
      FROM raw_events
      WHERE agent_id = $1
    `;

    const params = [agentId];
    let paramIndex = 2;

    if (eventType) {
      query += ` AND event_type = $${paramIndex}`;
      params.push(eventType);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND timestamp >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND timestamp <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY timestamp DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;

  } catch (err) {
    console.error('[EventLogger] Error getting events:', err.message);
    return [];
  }
}

/**
 * Get event statistics for an agent
 *
 * @param {string} agentId - Agent ID
 * @param {number} days - Number of days to look back (default: 7)
 * @returns {Promise<object>} Statistics object
 */
export async function getEventStats(agentId, days = 7) {
  try {
    const result = await pool.query(`
      SELECT
        event_type,
        COUNT(*) as count,
        MIN(timestamp) as first_occurrence,
        MAX(timestamp) as last_occurrence
      FROM raw_events
      WHERE agent_id = $1
        AND timestamp > NOW() - INTERVAL '${days} days'
      GROUP BY event_type
      ORDER BY count DESC
    `, [agentId]);

    return {
      agentId,
      days,
      totalEvents: result.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
      byType: result.rows,
    };

  } catch (err) {
    console.error('[EventLogger] Error getting stats:', err.message);
    return null;
  }
}

// CLI for testing
const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;
if (isMain) {
  const command = process.argv[2];

  if (command === 'test') {
    console.log('Testing event logger...\n');

    const eventId = await logEvent('test-agent', EVENT_TYPES.TOOL_EXECUTION, {
      tool: 'test-tool',
      status: 'completed',
      duration_ms: 1500,
    });

    console.log(`\nEvent ID: ${eventId}`);

    if (eventId) {
      const stats = await getEventStats('test-agent', 7);
      console.log('\nStats:', JSON.stringify(stats, null, 2));
    }

    await pool.end();
    process.exit(0);
  }

  if (command === 'stats') {
    const agentId = process.argv[3] || 'data-agent';
    const days = parseInt(process.argv[4]) || 7;

    const stats = await getEventStats(agentId, days);
    console.log(JSON.stringify(stats, null, 2));

    await pool.end();
    process.exit(0);
  }

  console.log('Usage:');
  console.log('  node event-logger.js test                    # Test logging');
  console.log('  node event-logger.js stats [agent] [days]    # Get stats');
  process.exit(0);
}
