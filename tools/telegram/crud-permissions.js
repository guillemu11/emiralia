/**
 * CRUD Permissions System
 *
 * Manages authorization for CRUD operations on resources.
 * Implements hybrid permission model: agent-based + role-based overrides.
 */

import { getUser } from '../db/telegram_user_queries.js';

// Agent-based permissions matrix
const PERMISSIONS_MATRIX = {
  'pm-agent': {
    projects: ['create', 'read', 'update', 'list'],
    tasks: ['create', 'read', 'update', 'delete', 'list'],
    phases: ['create', 'read', 'update', 'list'],
    inbox_items: ['read', 'update', 'list']
  },
  'data-agent': {
    properties: ['read', 'list'],
    developers: ['read', 'list'],
    agent_memory: ['read', 'list']
  },
  'content-agent': {
    inbox_items: ['create', 'read', 'update', 'list'],
    agent_memory: ['create', 'read', 'update', 'list']
  },
  'translation-agent': {
    inbox_items: ['read', 'list'],
    agent_memory: ['create', 'read', 'update', 'list']
  },
  'frontend-agent': {
    agent_memory: ['create', 'read', 'update', 'list']
  },
  'dev-agent': {
    agent_memory: ['create', 'read', 'update', 'list']
  },
  'marketing-agent': {
    inbox_items: ['create', 'read', 'update', 'list'],
    agent_memory: ['create', 'read', 'update', 'list']
  },
  'research-agent': {
    properties: ['read', 'list'],
    developers: ['read', 'list'],
    agent_memory: ['create', 'read', 'update', 'list']
  },
  'wat-auditor-agent': {
    agent_memory: ['read', 'list'],
    projects: ['read', 'list'],
    tasks: ['read', 'list'],
    raw_events: ['read', 'list']
  }
};

// Role-based overrides
const ROLE_PERMISSIONS = {
  admin: {
    // Full access to all resources
    _grant_all_: true
  },
  operator: {
    // Can read all resources + create/update in allowed agent resources
    _read_all_: true
  },
  viewer: {
    // Only read/list operations
    _allowed_operations_: ['read', 'list']
  }
};

/**
 * Check if user has permission for operation on resource
 * @param {string} userId - Telegram user ID
 * @param {string} agentId - Active agent ID
 * @param {string} resourceType - Resource type (e.g., 'projects')
 * @param {string} operation - Operation (create/read/update/delete/list)
 * @returns {Promise<boolean>}
 */
export async function checkPermission(userId, agentId, resourceType, operation) {
  try {
    // Get user from DB
    const user = await getUser(userId);

    if (!user) {
      console.error(`User ${userId} not found`);
      return false;
    }

    // Check if user is authorized
    if (!user.is_authorized) {
      console.log(`User ${userId} is not authorized`);
      return false;
    }

    // Admin has full access
    if (user.role === 'admin') {
      return true;
    }

    // Viewer can only read/list
    if (user.role === 'viewer' && !['read', 'list'].includes(operation)) {
      console.log(`Viewer ${userId} attempted ${operation} operation`);
      return false;
    }

    // Check agent-specific permissions
    const agentPerms = PERMISSIONS_MATRIX[agentId];
    if (!agentPerms) {
      console.error(`No permissions defined for agent: ${agentId}`);
      return false;
    }

    const resourcePerms = agentPerms[resourceType];
    if (!resourcePerms) {
      console.log(`Agent ${agentId} has no permissions for resource: ${resourceType}`);
      return false;
    }

    // Check if operation is allowed
    const allowed = resourcePerms.includes(operation);

    if (!allowed) {
      console.log(`Permission denied: ${agentId} cannot ${operation} ${resourceType}`);
    }

    return allowed;

  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Validate if user has access to specific resource instance (ownership check)
 * @param {string} userId - Telegram user ID
 * @param {string} userRole - User role
 * @param {string} resourceType - Resource type
 * @param {object} resource - Resource object with ownership fields
 * @returns {boolean}
 */
export function validateScope(userId, userRole, resourceType, resource) {
  // Admin bypasses scope check
  if (userRole === 'admin') {
    return true;
  }

  // Resources without ownership are public
  const publicResources = ['properties', 'developers', 'raw_events'];
  if (publicResources.includes(resourceType)) {
    return true;
  }

  // agent_memory: check agent_id matches active agent (handled at adapter level)
  if (resourceType === 'agent_memory') {
    return true; // Validated by adapter based on active agent
  }

  // For resources with ownership, verify user_id or created_by
  if (!resource) {
    console.error('Resource object required for scope validation');
    return false;
  }

  const ownerId = resource.user_id || resource.created_by;

  if (!ownerId) {
    // No ownership field means public resource
    return true;
  }

  // Check if user owns the resource
  const isOwner = String(ownerId) === String(userId);

  if (!isOwner) {
    console.log(`Scope denied: user ${userId} does not own ${resourceType}`);
  }

  return isOwner;
}

/**
 * Get list of resources accessible by agent
 * @param {string} agentId - Agent ID
 * @returns {string[]}
 */
export function getAgentResources(agentId) {
  const agentPerms = PERMISSIONS_MATRIX[agentId];
  return agentPerms ? Object.keys(agentPerms) : [];
}

/**
 * Get allowed operations for agent on resource
 * @param {string} agentId - Agent ID
 * @param {string} resourceType - Resource type
 * @returns {string[]}
 */
export function getAllowedOperations(agentId, resourceType) {
  const agentPerms = PERMISSIONS_MATRIX[agentId];
  if (!agentPerms || !agentPerms[resourceType]) {
    return [];
  }
  return agentPerms[resourceType];
}

/**
 * Check if resource type exists in any agent's permissions
 * @param {string} resourceType - Resource type
 * @returns {boolean}
 */
export function isValidResourceType(resourceType) {
  for (const agentPerms of Object.values(PERMISSIONS_MATRIX)) {
    if (resourceType in agentPerms) {
      return true;
    }
  }
  return false;
}
