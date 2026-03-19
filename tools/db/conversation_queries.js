/**
 * Conversation Queries
 *
 * Helper functions para gestionar conversaciones en agent_conversations
 *
 * Uso:
 *   import { getConversation, saveConversation, ... } from './conversation_queries.js';
 */

import pool from './pool.js';

/**
 * Obtiene una conversación específica
 * @param {string} userId - ID del usuario (telegram user_id o email)
 * @param {string} agentId - ID del agente
 * @param {string} channel - Canal (telegram|dashboard)
 * @returns {Promise<object|null>} - Conversación o null si no existe
 */
export async function getConversation(userId, agentId, channel) {
  try {
    const result = await pool.query(
      `SELECT * FROM agent_conversations
       WHERE user_id = $1 AND agent_id = $2 AND channel = $3`,
      [userId, agentId, channel]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('[Conversation Queries] Error getting conversation:', error);
    throw error;
  }
}

/**
 * Guarda un mensaje en la conversación (append)
 * @param {string} userId
 * @param {string} agentId
 * @param {string} channel
 * @param {string} role - 'user' o 'assistant'
 * @param {string} content - Contenido del mensaje
 * @returns {Promise<object>} - Conversación actualizada
 */
export async function saveMessage(userId, agentId, channel, role, content) {
  try {
    const timestamp = new Date().toISOString();
    const message = { role, content, timestamp };

    const result = await pool.query(
      `INSERT INTO agent_conversations (user_id, agent_id, channel, messages, last_message_at)
       VALUES ($1, $2, $3, $4::jsonb, $5)
       ON CONFLICT (user_id, agent_id, channel)
       DO UPDATE SET
         messages = agent_conversations.messages || $4::jsonb,
         last_message_at = $5,
         updated_at = NOW()
       RETURNING *`,
      [userId, agentId, channel, JSON.stringify([message]), timestamp]
    );

    return result.rows[0];
  } catch (error) {
    console.error('[Conversation Queries] Error saving message:', error);
    throw error;
  }
}

/**
 * Guarda toda la conversación (sobrescribe)
 * @param {string} userId
 * @param {string} agentId
 * @param {string} channel
 * @param {Array} messages - Array de mensajes [{role, content, timestamp}, ...]
 * @returns {Promise<object>} - Conversación guardada
 */
export async function saveConversation(userId, agentId, channel, messages) {
  try {
    const lastMessageAt = messages.length > 0
      ? messages[messages.length - 1].timestamp
      : new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO agent_conversations (user_id, agent_id, channel, messages, last_message_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, agent_id, channel)
       DO UPDATE SET
         messages = $4,
         last_message_at = $5,
         updated_at = NOW()
       RETURNING *`,
      [userId, agentId, channel, JSON.stringify(messages), lastMessageAt]
    );

    return result.rows[0];
  } catch (error) {
    console.error('[Conversation Queries] Error saving conversation:', error);
    throw error;
  }
}

/**
 * Lista conversaciones de un usuario
 * @param {string} userId
 * @param {object} options
 * @param {string} options.channel - Filtrar por canal (opcional)
 * @param {number} options.limit - Límite de resultados (default: 10)
 * @returns {Promise<Array>} - Lista de conversaciones
 */
export async function listConversations(userId, options = {}) {
  const { channel, limit = 10 } = options;

  try {
    let query = `
      SELECT
        id,
        agent_id,
        user_id,
        channel,
        jsonb_array_length(messages) as message_count,
        created_at,
        updated_at,
        last_message_at
      FROM agent_conversations
      WHERE user_id = $1
    `;

    const params = [userId];

    if (channel) {
      query += ` AND channel = $2`;
      params.push(channel);
    }

    query += ` ORDER BY last_message_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[Conversation Queries] Error listing conversations:', error);
    throw error;
  }
}

/**
 * Borra una conversación
 * @param {string} userId
 * @param {string} agentId
 * @param {string} channel
 * @returns {Promise<boolean>} - True si se borró, false si no existía
 */
export async function deleteConversation(userId, agentId, channel) {
  try {
    const result = await pool.query(
      `DELETE FROM agent_conversations
       WHERE user_id = $1 AND agent_id = $2 AND channel = $3
       RETURNING id`,
      [userId, agentId, channel]
    );

    return result.rowCount > 0;
  } catch (error) {
    console.error('[Conversation Queries] Error deleting conversation:', error);
    throw error;
  }
}

/**
 * Borra mensajes antiguos de una conversación (mantiene los últimos N)
 * @param {string} userId
 * @param {string} agentId
 * @param {string} channel
 * @param {number} keepLast - Número de mensajes a mantener (default: 50)
 * @returns {Promise<object>} - Conversación actualizada
 */
export async function trimConversation(userId, agentId, channel, keepLast = 50) {
  try {
    const conversation = await getConversation(userId, agentId, channel);

    if (!conversation || conversation.messages.length <= keepLast) {
      return conversation;
    }

    // Mantener solo los últimos N mensajes
    const trimmedMessages = conversation.messages.slice(-keepLast);

    const result = await pool.query(
      `UPDATE agent_conversations
       SET messages = $1, updated_at = NOW()
       WHERE user_id = $2 AND agent_id = $3 AND channel = $4
       RETURNING *`,
      [JSON.stringify(trimmedMessages), userId, agentId, channel]
    );

    return result.rows[0];
  } catch (error) {
    console.error('[Conversation Queries] Error trimming conversation:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de conversaciones
 * @returns {Promise<object>} - Estadísticas
 */
export async function getConversationStats() {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_conversations,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT agent_id) as unique_agents,
        SUM(jsonb_array_length(messages)) as total_messages,
        channel,
        COUNT(*) as conversations_per_channel
      FROM agent_conversations
      GROUP BY channel
    `);

    const overallStats = await pool.query(`
      SELECT
        COUNT(*) as total_conversations,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT agent_id) as unique_agents,
        SUM(jsonb_array_length(messages))::integer as total_messages,
        AVG(jsonb_array_length(messages))::numeric(10,2) as avg_messages_per_conversation
      FROM agent_conversations
    `);

    return {
      overall: overallStats.rows[0],
      by_channel: result.rows
    };
  } catch (error) {
    console.error('[Conversation Queries] Error getting stats:', error);
    throw error;
  }
}

/**
 * Cierra la conexión del pool (útil para cleanup en tests)
 */
export async function closePool() {
  await pool.end();
}

// CLI para testing
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const command = process.argv[2];

  if (command === 'stats') {
    getConversationStats()
      .then(stats => {
        console.log('\n📊 Conversation Statistics\n');
        console.log('Overall:', stats.overall);
        console.log('\nBy Channel:', stats.by_channel);
        process.exit(0);
      })
      .catch(err => {
        console.error('Error:', err);
        process.exit(1);
      });
  } else if (command === 'list') {
    const userId = process.argv[3];
    if (!userId) {
      console.error('Usage: node conversation_queries.js list <user_id>');
      process.exit(1);
    }

    listConversations(userId)
      .then(conversations => {
        console.log(`\n📝 Conversations for user ${userId}:\n`);
        console.table(conversations);
        process.exit(0);
      })
      .catch(err => {
        console.error('Error:', err);
        process.exit(1);
      });
  } else {
    console.log(`
Usage:
  node conversation_queries.js stats           # Ver estadísticas
  node conversation_queries.js list <user_id>  # Listar conversaciones de un usuario
    `);
    process.exit(0);
  }
}
